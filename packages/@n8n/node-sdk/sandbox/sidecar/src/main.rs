//! The n8n sandbox sidecar. It runs one WASM component of the Node Contract in wasmtime and
//! speaks `spec/json-rpc.md` on stdin and stdout: the host calls the exports of the world, and
//! the component calls the imports, which the sidecar forwards to the host. The WIT files of
//! the spec give the JSON form of each value, so one sidecar serves every world and version.
//!
//! The command line holds what the protocol does not: the component, the world, the granted
//! imports and the limits. A call to an import that is not granted stops the run. The
//! component gets no other import, except `wasi:random` (the OS random source) and, for the
//! JS guest, the code of its bundle.

use base64::Engine as _;
use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Stdin, Stdout, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use wasmtime::component::types::ComponentItem;
use wasmtime::component::{
    Component, Func, Instance, Linker, ResourceAny, ResourceDynamic, ResourceType, Val,
};
use wasmtime::{
    bail, format_err, AsContextMut, Config, Engine, ResourceLimiter, Result, Store,
    StoreContextMut, Trap,
};
use wit_parser::{
    Function, FunctionKind, Handle, InterfaceId, Resolve, Type, TypeDefKind, TypeId, TypeOwner,
    WorldItem,
};

const BUNDLE_IMPORT: &str = "n8n:js-guest/bundle@";
const RANDOM_IMPORT: &str = "wasi:random/";
const MAX_SAFE_INTEGER: u64 = (1 << 53) - 1;
const TICK: Duration = Duration::from_millis(2);
const MAX_TABLE_ELEMENTS: usize = 1 << 20;

struct Args {
    wit: PathBuf,
    world: String,
    component: PathBuf,
    /// The digest of the component, so a cached compile loads without reading the component.
    component_sha256: Option<String>,
    grants: Vec<String>,
    bundle: Option<PathBuf>,
    bundle_sha256: Option<String>,
    node_contract: String,
    memory_mb: usize,
    cpu_ms: u64,
    cache: Option<PathBuf>,
}

fn args() -> Result<Args> {
    let mut values: HashMap<String, Vec<String>> = HashMap::new();
    let mut argv = std::env::args().skip(1);
    while let Some(flag) = argv.next() {
        let Some(name) = flag.strip_prefix("--") else {
            bail!("unexpected argument {flag}")
        };
        let value = argv
            .next()
            .ok_or_else(|| format_err!("{flag} needs a value"))?;
        values.entry(name.to_string()).or_default().push(value);
    }
    let one = |name: &str| values.get(name).and_then(|list| list.last().cloned());
    let required = |name: &str| one(name).ok_or_else(|| format_err!("--{name} is required"));
    let number = |name: &str, default: u64| -> Result<u64> {
        one(name).map_or(Ok(default), |text| {
            text.parse()
                .map_err(|_| format_err!("--{name} must be a number"))
        })
    };
    Ok(Args {
        wit: required("wit")?.into(),
        world: required("world")?,
        component: required("component")?.into(),
        component_sha256: one("component-sha256"),
        grants: values.get("grant").cloned().unwrap_or_default(),
        bundle: one("bundle").map(PathBuf::from),
        bundle_sha256: one("bundle-sha256"),
        node_contract: required("node-contract")?,
        memory_mb: number("memory-mb", 256)? as usize,
        cpu_ms: number("cpu-ms", 30_000)?,
        cache: one("cache").map(PathBuf::from),
    })
}

/// The world of the spec: its imports and exports by component name, and the resources of the
/// imported interfaces, which the host numbers.
struct Spec {
    resolve: Resolve,
    version: String,
    kind: String,
    imports: HashMap<String, InterfaceId>,
    exports: HashMap<String, InterfaceId>,
    host_resources: HashMap<TypeId, u32>,
}

impl Spec {
    fn load(dir: &Path, world: &str) -> Result<Self> {
        let mut resolve = Resolve::default();
        let (package, _) = resolve.push_dir(dir).map_err(|e| format_err!("{e:#}"))?;
        let world_id = resolve
            .select_world(&[package], Some(world))
            .map_err(|e| format_err!("{e:#}"))?;
        let version = resolve.packages[package]
            .name
            .version
            .as_ref()
            .map(ToString::to_string)
            .ok_or_else(|| format_err!("the spec package has no version"))?;
        let interfaces = |items: Vec<&WorldItem>| {
            items
                .into_iter()
                .filter_map(|item| match item {
                    WorldItem::Interface { id, .. } => resolve.id_of(*id).map(|name| (name, *id)),
                    _ => None,
                })
                .collect::<HashMap<_, _>>()
        };
        let imports = interfaces(resolve.worlds[world_id].imports.values().collect());
        let exports = interfaces(resolve.worlds[world_id].exports.values().collect());
        let host_resources = resolve
            .types
            .iter()
            .filter(|(_, def)| {
                matches!(def.kind, TypeDefKind::Resource)
                    && matches!(def.owner, TypeOwner::Interface(owner) if imports.values().any(|id| *id == owner))
            })
            .enumerate()
            .map(|(index, (id, _))| (id, index as u32))
            .collect();
        let kind = world.trim_end_matches("-bundle").to_string();
        Ok(Self {
            resolve,
            version,
            kind,
            imports,
            exports,
            host_resources,
        })
    }

    fn interface_name(&self, id: InterfaceId) -> &str {
        self.resolve.interfaces[id].name.as_deref().unwrap_or("")
    }

    /// The JSON-RPC method of a WIT function: `<interface>.<function>`, and for a resource
    /// `<interface>.<resource>.<method>`, `.[new]` for its constructor.
    fn method_of(&self, interface: InterfaceId, function: &Function) -> String {
        let prefix = self.interface_name(interface);
        let name = &function.name;
        match function.kind {
            FunctionKind::Constructor(_) => format!(
                "{prefix}.{}.[new]",
                name.trim_start_matches("[constructor]")
            ),
            FunctionKind::Method(_) | FunctionKind::Static(_) => {
                let rest = name.split_once(']').map_or(name.as_str(), |(_, rest)| rest);
                format!("{prefix}.{rest}")
            }
            _ => format!("{prefix}.{name}"),
        }
    }

    /// Follows type aliases. `json` is an alias too, so check `is_json` first.
    fn dealias<'a>(&'a self, ty: &'a Type) -> &'a Type {
        match ty {
            Type::Id(id) => match &self.resolve.types[*id].kind {
                TypeDefKind::Type(inner) => self.dealias(inner),
                _ => ty,
            },
            _ => ty,
        }
    }

    /// `json` of `types`: a JSON value that crosses as text and is inline in JSON-RPC.
    fn is_json(&self, ty: &Type) -> bool {
        match ty {
            Type::Id(id) => {
                let def = &self.resolve.types[*id];
                match &def.kind {
                    TypeDefKind::Type(Type::String) => def.name.as_deref() == Some("json"),
                    TypeDefKind::Type(inner) => self.is_json(inner),
                    _ => false,
                }
            }
            _ => false,
        }
    }

    fn kind_of<'a>(&'a self, ty: &'a Type) -> Option<&'a TypeDefKind> {
        match self.dealias(ty) {
            Type::Id(id) => Some(&self.resolve.types[*id].kind),
            _ => None,
        }
    }
}

fn camel(name: &str) -> String {
    let mut out = String::with_capacity(name.len());
    let mut upper = false;
    for char in name.chars() {
        if char == '-' {
            upper = true;
        } else if upper {
            out.extend(char.to_uppercase());
            upper = false;
        } else {
            out.push(char);
        }
    }
    out
}

struct Io {
    input: BufReader<Stdin>,
    output: Stdout,
}

impl Io {
    fn send(&mut self, message: &Value) -> Result<()> {
        let mut line = serde_json::to_vec(message).map_err(|e| format_err!("{e}"))?;
        line.push(b'\n');
        self.output.write_all(&line)?;
        self.output.flush()?;
        Ok(())
    }

    fn recv(&mut self) -> Result<Option<Value>> {
        let mut line = String::new();
        if self.input.read_line(&mut line)? == 0 {
            return Ok(None);
        }
        serde_json::from_str(&line)
            .map(Some)
            .map_err(|e| format_err!("the host sent a line that is not JSON: {e}"))
    }
}

/// Refuses a memory grow above the cap, so the guest gets an out-of-memory error.
struct Limiter {
    cap: usize,
    total: usize,
    refused: bool,
}

impl ResourceLimiter for Limiter {
    fn memory_growing(
        &mut self,
        current: usize,
        desired: usize,
        _max: Option<usize>,
    ) -> Result<bool> {
        let total = self.total - current + desired;
        if total > self.cap {
            self.refused = true;
            return Ok(false);
        }
        self.total = total;
        Ok(true)
    }

    fn table_growing(
        &mut self,
        _current: usize,
        desired: usize,
        _max: Option<usize>,
    ) -> Result<bool> {
        Ok(desired <= MAX_TABLE_ELEMENTS)
    }
}

struct State {
    io: Arc<Mutex<Io>>,
    limiter: Limiter,
    next_call: u64,
    /// Guest CPU time that is left. Time in host calls does not count.
    budget: Duration,
    slice: Instant,
    /// The resources the guest created, by the number the host sees.
    guest_handles: HashMap<u64, ResourceAny>,
    next_handle: u64,
    bundle: Arc<String>,
}

impl State {
    fn spend(&mut self) {
        let now = Instant::now();
        self.budget = self.budget.saturating_sub(now - self.slice);
        self.slice = now;
    }

    /// A guest-to-host call: one request, then the line with its answer. The host sends
    /// nothing else while it waits for the guest.
    fn call_host(
        &mut self,
        method: &str,
        params: Value,
    ) -> Result<std::result::Result<Value, Value>> {
        self.next_call += 1;
        let id = format!("g{}", self.next_call);
        let mut io = self
            .io
            .lock()
            .map_err(|_| format_err!("the JSON-RPC connection is broken"))?;
        io.send(&json!({ "jsonrpc": "2.0", "id": id, "method": method, "params": params }))?;
        let Some(reply) = io.recv()? else {
            bail!("the host closed the connection")
        };
        if reply["id"].as_str() != Some(id.as_str()) {
            bail!("the host sent another message while the guest waited for {method}");
        }
        Ok(match reply.get("error") {
            Some(error) => Err(error.clone()),
            None => Ok(reply.get("result").cloned().unwrap_or(Value::Null)),
        })
    }

    fn notify(&mut self, method: &str, params: Value) -> Result<()> {
        let mut io = self
            .io
            .lock()
            .map_err(|_| format_err!("the JSON-RPC connection is broken"))?;
        io.send(&json!({ "jsonrpc": "2.0", "method": method, "params": params }))
    }
}

fn ticks(budget: Duration) -> u64 {
    (budget.as_nanos() / TICK.as_nanos()).max(1) as u64
}

/// Values between wasmtime and JSON, along the WIT types of the spec.
struct Codec(Arc<Spec>);

impl Codec {
    fn spec(&self) -> &Spec {
        &self.0
    }

    fn json_of(
        &self,
        store: &mut StoreContextMut<'_, State>,
        ty: &Type,
        val: Val,
    ) -> Result<Value> {
        let spec = self.spec();
        if spec.is_json(ty) {
            let Val::String(text) = val else {
                bail!("a json value must be text")
            };
            return serde_json::from_str(&text)
                .map_err(|e| format_err!("the bundle gave text that is not JSON: {e}"));
        }
        Ok(match (spec.dealias(ty), val) {
            (Type::Bool, Val::Bool(v)) => json!(v),
            (Type::U8, Val::U8(v)) => json!(v),
            (Type::U16, Val::U16(v)) => json!(v),
            (Type::U32, Val::U32(v)) => json!(v),
            (Type::S8, Val::S8(v)) => json!(v),
            (Type::S16, Val::S16(v)) => json!(v),
            (Type::S32, Val::S32(v)) => json!(v),
            (Type::U64, Val::U64(v)) => {
                if v > MAX_SAFE_INTEGER {
                    bail!("{v} is above 2^53 - 1");
                }
                json!(v)
            }
            (Type::S64, Val::S64(v)) => {
                if v.unsigned_abs() > MAX_SAFE_INTEGER {
                    bail!("{v} is outside ±(2^53 - 1)");
                }
                json!(v)
            }
            (Type::F32, Val::Float32(v)) => number(f64::from(v))?,
            (Type::F64, Val::Float64(v)) => number(v)?,
            (Type::Char, Val::Char(v)) => json!(v.to_string()),
            (Type::String, Val::String(v)) => json!(v),
            (Type::Id(id), val) => self.typedef_json_of(store, *id, val)?,
            (ty, val) => bail!("{val:?} does not match {ty:?}"),
        })
    }

    fn typedef_json_of(
        &self,
        store: &mut StoreContextMut<'_, State>,
        id: TypeId,
        val: Val,
    ) -> Result<Value> {
        let spec = self.0.clone();
        Ok(match (&spec.resolve.types[id].kind, val) {
            (TypeDefKind::Record(record), Val::Record(fields)) => {
                let mut object = Map::new();
                for (field, (_, value)) in record.fields.iter().zip(fields) {
                    if let Some(value) = self.field_json_of(store, &field.ty, value)? {
                        object.insert(camel(&field.name), value);
                    }
                }
                Value::Object(object)
            }
            (TypeDefKind::Variant(variant), Val::Variant(name, payload)) => {
                let case = variant
                    .cases
                    .iter()
                    .find(|case| case.name == name)
                    .ok_or_else(|| format_err!("no case {name}"))?;
                match (&case.ty, payload) {
                    (Some(ty), Some(payload)) => {
                        json!({ "tag": camel(&name), "val": self.json_of(store, ty, *payload)? })
                    }
                    _ => json!({ "tag": camel(&name) }),
                }
            }
            (TypeDefKind::Enum(_), Val::Enum(name)) => json!(camel(&name)),
            (TypeDefKind::Option(inner), Val::Option(value)) => match value {
                None => Value::Null,
                // A JSON value can be null, so an option of one needs a wrapper.
                Some(value) if spec.is_json(inner) => {
                    json!({ "some": self.json_of(store, inner, *value)? })
                }
                Some(value) => self.json_of(store, inner, *value)?,
            },
            (TypeDefKind::List(inner), Val::List(values)) => {
                if matches!(spec.dealias(inner), Type::U8) {
                    let bytes = values
                        .into_iter()
                        .map(|v| {
                            if let Val::U8(b) = v {
                                Ok(b)
                            } else {
                                bail!("not a byte")
                            }
                        })
                        .collect::<Result<Vec<_>>>()?;
                    json!(base64::engine::general_purpose::STANDARD.encode(bytes))
                } else {
                    Value::Array(
                        values
                            .into_iter()
                            .map(|v| self.json_of(store, inner, v))
                            .collect::<Result<_>>()?,
                    )
                }
            }
            (TypeDefKind::Tuple(tuple), Val::Tuple(values)) => Value::Array(
                tuple
                    .types
                    .iter()
                    .zip(values)
                    .map(|(ty, v)| self.json_of(store, ty, v))
                    .collect::<Result<_>>()?,
            ),
            (
                TypeDefKind::Handle(Handle::Own(resource) | Handle::Borrow(resource)),
                Val::Resource(any),
            ) => {
                if let Some(&ty) = spec.host_resources.get(resource) {
                    let handle = ResourceDynamic::try_from_resource_any(any, &mut *store)?;
                    if handle.ty() != ty {
                        bail!("a handle of another resource type");
                    }
                    json!(handle.rep())
                } else {
                    let state = store.data_mut();
                    let handle = state.next_handle;
                    state.next_handle += 1;
                    state.guest_handles.insert(handle, any);
                    json!(handle)
                }
            }
            (kind, val) => bail!("{val:?} does not match {kind:?}"),
        })
    }

    /// A record field or a parameter: an option that is none is left out.
    fn field_json_of(
        &self,
        store: &mut StoreContextMut<'_, State>,
        ty: &Type,
        val: Val,
    ) -> Result<Option<Value>> {
        match (self.spec().kind_of(ty), val) {
            (Some(TypeDefKind::Option(inner)), Val::Option(value)) => {
                let inner = *inner;
                value
                    .map(|value| self.json_of(store, &inner, *value))
                    .transpose()
            }
            (_, val) => self.json_of(store, ty, val).map(Some),
        }
    }

    fn val_of(
        &self,
        store: &mut StoreContextMut<'_, State>,
        ty: &Type,
        value: &Value,
    ) -> Result<Val> {
        let spec = self.spec();
        if spec.is_json(ty) {
            return Ok(Val::String(value.to_string()));
        }
        let integer = || {
            value
                .as_u64()
                .ok_or_else(|| format_err!("{value} is not a whole number"))
        };
        Ok(match spec.dealias(ty) {
            Type::Bool => Val::Bool(
                value
                    .as_bool()
                    .ok_or_else(|| format_err!("{value} is not a boolean"))?,
            ),
            Type::U8 => Val::U8(u8::try_from(integer()?)?),
            Type::U16 => Val::U16(u16::try_from(integer()?)?),
            Type::U32 => Val::U32(u32::try_from(integer()?)?),
            Type::U64 => {
                let v = integer()?;
                if v > MAX_SAFE_INTEGER {
                    bail!("{v} is above 2^53 - 1");
                }
                Val::U64(v)
            }
            Type::S8 | Type::S16 | Type::S32 | Type::S64 => {
                let v = value
                    .as_i64()
                    .ok_or_else(|| format_err!("{value} is not a whole number"))?;
                match spec.dealias(ty) {
                    Type::S8 => Val::S8(i8::try_from(v)?),
                    Type::S16 => Val::S16(i16::try_from(v)?),
                    Type::S32 => Val::S32(i32::try_from(v)?),
                    _ => Val::S64(v),
                }
            }
            Type::F32 => Val::Float32(
                value
                    .as_f64()
                    .ok_or_else(|| format_err!("{value} is not a number"))? as f32,
            ),
            Type::F64 => Val::Float64(
                value
                    .as_f64()
                    .ok_or_else(|| format_err!("{value} is not a number"))?,
            ),
            Type::Char => Val::Char(
                value
                    .as_str()
                    .and_then(|s| s.chars().next())
                    .ok_or_else(|| format_err!("{value} is not a char"))?,
            ),
            Type::String => Val::String(
                value
                    .as_str()
                    .ok_or_else(|| format_err!("{value} is not a string"))?
                    .to_string(),
            ),
            Type::Id(id) => self.typedef_val_of(store, *id, value)?,
            Type::ErrorContext => bail!("error-context is not supported"),
        })
    }

    fn typedef_val_of(
        &self,
        store: &mut StoreContextMut<'_, State>,
        id: TypeId,
        value: &Value,
    ) -> Result<Val> {
        let spec = self.0.clone();
        Ok(match &spec.resolve.types[id].kind {
            TypeDefKind::Record(record) => {
                let object = value
                    .as_object()
                    .ok_or_else(|| format_err!("{value} is not an object"))?;
                let fields = record
                    .fields
                    .iter()
                    .map(|field| {
                        Ok((
                            field.name.clone(),
                            self.field_val_of(
                                store,
                                &field.ty,
                                object.get(&camel(&field.name)),
                                &field.name,
                            )?,
                        ))
                    })
                    .collect::<Result<_>>()?;
                Val::Record(fields)
            }
            TypeDefKind::Variant(variant) => {
                let tag = value["tag"]
                    .as_str()
                    .ok_or_else(|| format_err!("{value} has no tag"))?;
                let case = variant
                    .cases
                    .iter()
                    .find(|case| camel(&case.name) == tag)
                    .ok_or_else(|| format_err!("no case {tag}"))?;
                let payload = match &case.ty {
                    Some(ty) => Some(Box::new(self.val_of(store, ty, &value["val"])?)),
                    None => None,
                };
                Val::Variant(case.name.clone(), payload)
            }
            TypeDefKind::Enum(cases) => {
                let name = value
                    .as_str()
                    .ok_or_else(|| format_err!("{value} is not a string"))?;
                let case = cases
                    .cases
                    .iter()
                    .find(|case| camel(&case.name) == name)
                    .ok_or_else(|| format_err!("no case {name}"))?;
                Val::Enum(case.name.clone())
            }
            TypeDefKind::Option(inner) => {
                if value.is_null() {
                    Val::Option(None)
                } else if spec.is_json(inner) {
                    let some = value
                        .get("some")
                        .ok_or_else(|| format_err!("{value} is not {{ \"some\": … }}"))?;
                    Val::Option(Some(Box::new(self.val_of(store, inner, some)?)))
                } else {
                    Val::Option(Some(Box::new(self.val_of(store, inner, value)?)))
                }
            }
            TypeDefKind::List(inner) => {
                if matches!(spec.dealias(inner), Type::U8) {
                    let text = value
                        .as_str()
                        .ok_or_else(|| format_err!("bytes must be base64 text"))?;
                    let bytes = base64::engine::general_purpose::STANDARD
                        .decode(text)
                        .map_err(|e| format_err!("{e}"))?;
                    Val::List(bytes.into_iter().map(Val::U8).collect())
                } else {
                    let list = value
                        .as_array()
                        .ok_or_else(|| format_err!("{value} is not an array"))?;
                    Val::List(
                        list.iter()
                            .map(|v| self.val_of(store, inner, v))
                            .collect::<Result<_>>()?,
                    )
                }
            }
            TypeDefKind::Tuple(tuple) => {
                let list = value
                    .as_array()
                    .filter(|list| list.len() == tuple.types.len())
                    .ok_or_else(|| {
                        format_err!("{value} is not a tuple of {}", tuple.types.len())
                    })?;
                Val::Tuple(
                    tuple
                        .types
                        .iter()
                        .zip(list)
                        .map(|(ty, v)| self.val_of(store, ty, v))
                        .collect::<Result<_>>()?,
                )
            }
            TypeDefKind::Handle(handle) => {
                let number = value
                    .as_u64()
                    .ok_or_else(|| format_err!("{value} is not a handle"))?;
                let (resource, own) = match handle {
                    Handle::Own(resource) => (resource, true),
                    Handle::Borrow(resource) => (resource, false),
                };
                if let Some(&ty) = spec.host_resources.get(resource) {
                    let rep = u32::try_from(number)?;
                    let handle = if own {
                        ResourceDynamic::new_own(rep, ty)
                    } else {
                        ResourceDynamic::new_borrow(rep, ty)
                    };
                    Val::Resource(handle.try_into_resource_any(&mut *store)?)
                } else {
                    let handles = &mut store.data_mut().guest_handles;
                    let any = if own {
                        handles.remove(&number)
                    } else {
                        handles.get(&number).copied()
                    };
                    Val::Resource(any.ok_or_else(|| format_err!("no handle {number}"))?)
                }
            }
            TypeDefKind::Type(inner) => self.val_of(store, inner, value)?,
            kind => bail!("{kind:?} is not supported"),
        })
    }

    fn field_val_of(
        &self,
        store: &mut StoreContextMut<'_, State>,
        ty: &Type,
        value: Option<&Value>,
        name: &str,
    ) -> Result<Val> {
        match (self.spec().kind_of(ty), value) {
            (Some(TypeDefKind::Option(inner)), value) => {
                let inner = *inner;
                match value {
                    None => Ok(Val::Option(None)),
                    Some(Value::Null) if !self.spec().is_json(&inner) => Ok(Val::Option(None)),
                    Some(value) => Ok(Val::Option(Some(Box::new(
                        self.val_of(store, &inner, value)?,
                    )))),
                }
            }
            (_, Some(value)) => self.val_of(store, ty, value),
            (_, None) => bail!("{} is missing", camel(name)),
        }
    }

    fn params_json_of(
        &self,
        store: &mut StoreContextMut<'_, State>,
        function: &Function,
        params: &[Val],
    ) -> Result<Value> {
        let mut object = Map::new();
        for (param, value) in function.params.iter().zip(params) {
            if let Some(value) = self.field_json_of(store, &param.ty, value.clone())? {
                object.insert(camel(&param.name), value);
            }
        }
        Ok(Value::Object(object))
    }

    fn params_val_of(
        &self,
        store: &mut StoreContextMut<'_, State>,
        function: &Function,
        params: &Value,
    ) -> Result<Vec<Val>> {
        function
            .params
            .iter()
            .map(|param| {
                self.field_val_of(
                    store,
                    &param.ty,
                    params.get(camel(&param.name)),
                    &param.name,
                )
            })
            .collect()
    }
}

fn number(v: f64) -> Result<Value> {
    serde_json::Number::from_f64(v)
        .map(Value::Number)
        .ok_or_else(|| format_err!("{v} is not a JSON number"))
}

/// A JSON-RPC error of a WIT `result`: −32000, the message, and the error value as `data`.
fn result_error(spec: &Spec, ty: Option<&Type>, data: Value) -> Value {
    let message = match ty.map(|ty| (spec.dealias(ty), spec.kind_of(ty))) {
        Some((Type::String, _)) => data.as_str().unwrap_or_default().to_string(),
        Some((_, Some(TypeDefKind::Variant(_)))) => {
            data["tag"].as_str().unwrap_or_default().to_string()
        }
        _ => data["message"].as_str().unwrap_or("error").to_string(),
    };
    json!({ "code": -32000, "message": message, "data": data })
}

fn rpc_error(code: i64, message: impl Into<String>) -> Value {
    json!({ "code": code, "message": message.into() })
}

/// The import functions of the world, forwarded to the host when granted.
fn link_spec_import(
    linker: &mut Linker<State>,
    spec: &Arc<Spec>,
    name: &str,
    interface: InterfaceId,
    granted: bool,
    items: Vec<(String, ComponentItem)>,
) -> Result<()> {
    let mut instance = linker.instance(name)?;
    let wit = &spec.resolve.interfaces[interface];
    for (item_name, item) in items {
        match item {
            ComponentItem::Resource(_) => {
                let resource = *wit
                    .types
                    .get(&item_name)
                    .ok_or_else(|| format_err!("{name} has no resource {item_name}"))?;
                let ty = *spec
                    .host_resources
                    .get(&resource)
                    .ok_or_else(|| format_err!("{item_name} is not a host resource"))?;
                let method = format!("{}.{item_name}.[drop]", spec.interface_name(interface));
                instance.resource(
                    &item_name,
                    ResourceType::host_dynamic(ty),
                    move |mut store, rep| store.data_mut().notify(&method, json!({ "self": rep })),
                )?;
            }
            ComponentItem::ComponentFunc(_) => {
                let function = wit
                    .functions
                    .get(&item_name)
                    .ok_or_else(|| format_err!("{name} has no function {item_name}"))?
                    .clone();
                let method = spec.method_of(interface, &function);
                let codec = Codec(spec.clone());
                instance.func_new(&item_name, move |mut store, _ty, params, results| {
                    if !granted {
                        bail!("The bundle called {method}, which its manifest does not grant");
                    }
                    let params = codec.params_json_of(&mut store, &function, params)?;
                    let Some(result) = &function.result else {
                        return store.data_mut().notify(&method, params);
                    };
                    store.data_mut().spend();
                    let answer = store.data_mut().call_host(&method, params)?;
                    let state = store.data_mut();
                    state.slice = Instant::now();
                    let budget = state.budget;
                    store.set_epoch_deadline(ticks(budget));
                    results[0] = match (codec.spec().kind_of(result), answer) {
                        (Some(TypeDefKind::Result(r)), Ok(value)) => {
                            let ok = r.ok;
                            Val::Result(Ok(match ok {
                                Some(ty) => Some(Box::new(codec.val_of(&mut store, &ty, &value)?)),
                                None => None,
                            }))
                        }
                        (Some(TypeDefKind::Result(r)), Err(error)) if error["code"] == -32000 => {
                            let err = r.err;
                            Val::Result(Err(match err {
                                Some(ty) => {
                                    Some(Box::new(codec.val_of(&mut store, &ty, &error["data"])?))
                                }
                                None => None,
                            }))
                        }
                        (_, Ok(value)) => codec.val_of(&mut store, result, &value)?,
                        (_, Err(error)) => bail!(
                            "The host refused {method}: {}",
                            error["message"].as_str().unwrap_or("no message")
                        ),
                    };
                    Ok(())
                })?;
            }
            _ => {}
        }
    }
    Ok(())
}

fn link_random(
    linker: &mut Linker<State>,
    name: &str,
    items: Vec<(String, ComponentItem)>,
) -> Result<()> {
    let mut instance = linker.instance(name)?;
    for (item_name, _) in items {
        let random = |len: usize| -> Result<Vec<u8>> {
            let mut bytes = vec![0u8; len];
            getrandom::getrandom(&mut bytes).map_err(|e| format_err!("{e}"))?;
            Ok(bytes)
        };
        match item_name.as_str() {
            "get-random-bytes" | "get-insecure-random-bytes" => {
                instance.func_new(&item_name, move |_, _, params, results| {
                    let Some(Val::U64(len)) = params.first() else {
                        bail!("get-random-bytes needs a length")
                    };
                    if *len > 1 << 20 {
                        bail!("The bundle asked for more than 1 MiB of random bytes");
                    }
                    results[0] =
                        Val::List(random(*len as usize)?.into_iter().map(Val::U8).collect());
                    Ok(())
                })?
            }
            "get-random-u64" | "get-insecure-random-u64" => {
                instance.func_new(&item_name, move |_, _, _, results| {
                    let bytes = random(8)?;
                    results[0] = Val::U64(u64::from_le_bytes(
                        bytes.try_into().map_err(|_| format_err!("random"))?,
                    ));
                    Ok(())
                })?
            }
            "insecure-seed" => instance.func_new(&item_name, move |_, _, _, results| {
                let bytes = random(16)?;
                let (a, b) = bytes.split_at(8);
                results[0] = Val::Tuple(vec![
                    Val::U64(u64::from_le_bytes(
                        a.try_into().map_err(|_| format_err!("random"))?,
                    )),
                    Val::U64(u64::from_le_bytes(
                        b.try_into().map_err(|_| format_err!("random"))?,
                    )),
                ]);
                Ok(())
            })?,
            other => bail!("{name} has no function {other}"),
        }
    }
    Ok(())
}

struct Live {
    store: Store<State>,
    instance: Instance,
    funcs: HashMap<String, Func>,
}

struct Host {
    args: Args,
    engine: Engine,
    io: Arc<Mutex<Io>>,
    spec: Arc<Spec>,
    live: Option<Live>,
    /// The error that stopped the component. Every later call gets it.
    stopped: Option<String>,
}

impl Host {
    /// The component, compiled once per digest and engine config into `--cache`.
    fn compile(&self) -> Result<Component> {
        let read = || {
            let bytes = std::fs::read(&self.args.component)
                .map_err(|e| format_err!("read {}: {e}", self.args.component.display()))?;
            if let Some(digest) = &self.args.component_sha256 {
                if &hex(&Sha256::digest(&bytes)) != digest {
                    bail!("The component does not match --component-sha256");
                }
            }
            Ok(bytes)
        };
        let (Some(cache), Some(digest)) = (&self.args.cache, &self.args.component_sha256) else {
            return Component::new(&self.engine, read()?);
        };
        let mut engine_hash = std::collections::hash_map::DefaultHasher::new();
        std::hash::Hash::hash(
            &self.engine.precompile_compatibility_hash(),
            &mut engine_hash,
        );
        let key = format!("{digest}-{:016x}", std::hash::Hasher::finish(&engine_hash));
        let file = cache.join(format!("{key}.cwasm"));
        if !file.exists() {
            let bytes = read()?;
            std::fs::create_dir_all(cache)?;
            let partial = cache.join(format!("{key}.{}.partial", std::process::id()));
            std::fs::write(&partial, self.engine.precompile_component(&bytes)?)?;
            std::fs::rename(&partial, &file)?;
        }
        // SAFETY: the file comes from `precompile_component` of an engine with this config, for
        // the component with this digest. Only n8n can write the cache directory.
        unsafe { Component::deserialize_file(&self.engine, &file) }
    }

    fn bundle(&self) -> Result<String> {
        let Some(file) = &self.args.bundle else {
            return Ok(String::new());
        };
        let code = std::fs::read_to_string(file)
            .map_err(|e| format_err!("read {}: {e}", file.display()))?;
        let digest = hex(&Sha256::digest(code.as_bytes()));
        if self.args.bundle_sha256.as_deref() != Some(digest.as_str()) {
            bail!("The bundle file does not match --bundle-sha256");
        }
        Ok(code)
    }

    fn initialize(&mut self, params: &Value) -> Result<Value> {
        if self.live.is_some() {
            bail!("[initialize] comes once");
        }
        let host_version = params["nodeContract"].as_str().unwrap_or_default();
        let major = |version: &str| version.split('.').next().unwrap_or_default().to_string();
        if major(host_version) != major(&self.spec.version) {
            bail!(
                "The host implements Node Contract {host_version}, the sidecar {}",
                self.spec.version
            );
        }
        let short_imports: HashMap<&str, &str> = self
            .spec
            .imports
            .iter()
            .map(|(full, id)| (self.spec.interface_name(*id), full.as_str()))
            .collect();
        for grant in &self.args.grants {
            if !short_imports.contains_key(grant.as_str()) {
                bail!("{grant} is not an import of the {} world", self.args.world);
            }
        }
        let component = self.compile()?;
        let ty = component.component_type();
        let mut linker: Linker<State> = Linker::new(&self.engine);
        for (name, item) in ty.imports(&self.engine) {
            let ComponentItem::ComponentInstance(instance) = item.ty else {
                bail!("The component imports {name}, which is not an interface")
            };
            let items: Vec<(String, ComponentItem)> = instance
                .exports(&self.engine)
                .map(|(n, i)| (n.to_string(), i.ty))
                .collect();
            if name.starts_with(BUNDLE_IMPORT) {
                let mut bundle = linker.instance(name)?;
                bundle.func_new("source", |store, _, _, results| {
                    results[0] = Val::String(store.data().bundle.as_ref().clone());
                    Ok(())
                })?;
            } else if name.starts_with(RANDOM_IMPORT) {
                link_random(&mut linker, name, items)?;
            } else if let Some(&interface) = self.spec.imports.get(name) {
                let granted = self
                    .args
                    .grants
                    .iter()
                    .any(|grant| grant == self.spec.interface_name(interface));
                link_spec_import(&mut linker, &self.spec, name, interface, granted, items)?;
            } else {
                bail!("The component imports {name}, which the {} world of Node Contract {} does not have", self.args.world, self.spec.version);
            }
        }
        for name in self.spec.exports.keys() {
            if ty.get_export(&self.engine, name).is_none() {
                bail!("The component does not export {name}");
            }
        }
        let state = State {
            io: self.io.clone(),
            limiter: Limiter {
                cap: self.args.memory_mb << 20,
                total: 0,
                refused: false,
            },
            next_call: 0,
            budget: Duration::from_millis(self.args.cpu_ms),
            slice: Instant::now(),
            guest_handles: HashMap::new(),
            next_handle: 1,
            bundle: Arc::new(self.bundle()?),
        };
        let mut store = Store::new(&self.engine, state);
        store.limiter(|state| &mut state.limiter);
        store.set_epoch_deadline(ticks(Duration::from_millis(self.args.cpu_ms)));
        let instance = linker.instantiate(&mut store, &component)?;
        self.live = Some(Live {
            store,
            instance,
            funcs: HashMap::new(),
        });
        Ok(json!({ "nodeContract": self.args.node_contract, "kind": self.spec.kind }))
    }

    /// The export function and its WIT form for a method, e.g. `action.item-run.next`.
    fn export_of(&self, method: &str) -> Option<(String, InterfaceId, Function)> {
        let (interface_name, rest) = method.split_once('.')?;
        let (full, &interface) = self
            .spec
            .exports
            .iter()
            .find(|(_, id)| self.spec.interface_name(**id) == interface_name)?;
        let functions = &self.spec.resolve.interfaces[interface].functions;
        let found = match rest.split_once('.') {
            Some((resource, "[new]")) => functions.get(&format!("[constructor]{resource}")),
            Some((resource, name)) => functions
                .get(&format!("[method]{resource}.{name}"))
                .or_else(|| functions.get(&format!("[static]{resource}.{name}"))),
            None => functions.get(rest),
        }?;
        Some((full.clone(), interface, found.clone()))
    }

    fn func(&mut self, interface: &str, name: &str) -> Result<Func> {
        let live = self
            .live
            .as_mut()
            .ok_or_else(|| format_err!("[initialize] comes first"))?;
        let key = format!("{interface}#{name}");
        if let Some(func) = live.funcs.get(&key) {
            return Ok(*func);
        }
        let parent = live
            .instance
            .get_export_index(&mut live.store, None, interface)
            .ok_or_else(|| format_err!("no export {interface}"))?;
        let index = live
            .instance
            .get_export_index(&mut live.store, Some(&parent), name)
            .ok_or_else(|| format_err!("no export {name}"))?;
        let func = live
            .instance
            .get_func(&mut live.store, index)
            .ok_or_else(|| format_err!("{name} is not a function"))?;
        live.funcs.insert(key, func);
        Ok(func)
    }

    /// Calls one export with the CPU budget that is left. A trap stops the component.
    fn call(
        &mut self,
        interface: &str,
        function: &Function,
        params: &Value,
    ) -> std::result::Result<Option<Val>, Value> {
        let func = self
            .func(interface, &function.name)
            .map_err(|e| rpc_error(-32603, format!("{e:#}")))?;
        let codec = Codec(self.spec.clone());
        let (cpu_ms, memory_mb) = (self.args.cpu_ms, self.args.memory_mb);
        let live = self
            .live
            .as_mut()
            .ok_or_else(|| rpc_error(-32603, "[initialize] comes first"))?;
        let values = codec
            .params_val_of(&mut live.store.as_context_mut(), function, params)
            .map_err(|e| rpc_error(-32602, format!("{e:#}")))?;
        let mut results = vec![Val::Bool(false); usize::from(function.result.is_some())];
        let state = live.store.data_mut();
        let stopped = if state.budget.is_zero() {
            Err(format!(
                "The bundle used its CPU time of {cpu_ms} ms and was stopped"
            ))
        } else {
            state.slice = Instant::now();
            let budget = state.budget;
            live.store.set_epoch_deadline(ticks(budget));
            let outcome = func.call(&mut live.store, &values, &mut results);
            live.store.data_mut().spend();
            let refused = live.store.data().limiter.refused;
            // The JS engine can catch its out-of-memory error; the run stops anyway.
            let outcome = if refused && outcome.is_ok() {
                Err(format_err!("out of memory"))
            } else {
                outcome
            };
            outcome.map_err(|error| match error.downcast_ref::<Trap>() {
                Some(Trap::Interrupt) => format!("The bundle used its CPU time of {cpu_ms} ms and was stopped"),
                _ if refused => format!("The bundle reached its memory limit of {memory_mb} MB and was stopped"),
                Some(Trap::UnreachableCodeReached) => "The bundle stopped the JS engine (a WASM trap). It may use what the sandbox does not have, for example a dynamic import or a Unicode property escape (\\p{…}) in a regular expression".to_string(),
                Some(trap) => format!("The bundle stopped with a WASM trap: {trap}"),
                // A host function failed, e.g. an import that is not granted: its message is the cause.
                None => error.root_cause().to_string(),
            })
        };
        match stopped {
            Ok(()) => Ok(results.into_iter().next()),
            Err(message) => Err(self.stop(message)),
        }
    }

    fn stop(&mut self, message: String) -> Value {
        self.stopped = Some(message.clone());
        self.live = None;
        rpc_error(-32000, message)
    }

    fn result_json(
        &mut self,
        function: &Function,
        result: Option<Val>,
    ) -> std::result::Result<Value, Value> {
        let codec = Codec(self.spec.clone());
        let live = self
            .live
            .as_mut()
            .ok_or_else(|| rpc_error(-32603, "the component stopped"))?;
        let mut store = live.store.as_context_mut();
        let (Some(ty), Some(val)) = (&function.result, result) else {
            return Ok(Value::Null);
        };
        let failed = |e: wasmtime::Error| rpc_error(-32603, format!("{e:#}"));
        match (codec.spec().kind_of(ty), val) {
            (Some(TypeDefKind::Result(r)), Val::Result(outcome)) => {
                let (ok, err) = (r.ok, r.err);
                match outcome {
                    Ok(value) => match (ok, value) {
                        (Some(ty), Some(value)) => {
                            codec.json_of(&mut store, &ty, *value).map_err(failed)
                        }
                        _ => Ok(Value::Null),
                    },
                    Err(value) => {
                        let data = match (err, value) {
                            (Some(ty), Some(value)) => {
                                codec.json_of(&mut store, &ty, *value).map_err(failed)?
                            }
                            _ => Value::Null,
                        };
                        Err(result_error(codec.spec(), err.as_ref(), data))
                    }
                }
            }
            (_, val) => codec.json_of(&mut store, ty, val).map_err(failed),
        }
    }

    fn dispatch(&mut self, method: &str, params: &Value) -> std::result::Result<Value, Value> {
        if method == "[initialize]" {
            return self
                .initialize(params)
                .map_err(|e| rpc_error(-32000, format!("{e:#}")));
        }
        if let Some(message) = &self.stopped {
            return Err(rpc_error(-32000, message.clone()));
        }
        if let Some(resource) = method.strip_suffix(".[drop]") {
            let handle = params["self"].as_u64().unwrap_or(0);
            let live = self
                .live
                .as_mut()
                .ok_or_else(|| rpc_error(-32603, "[initialize] comes first"))?;
            if let Some(any) = live.store.data_mut().guest_handles.remove(&handle) {
                any.resource_drop(&mut live.store)
                    .map_err(|e| rpc_error(-32000, format!("drop {resource}: {e:#}")))?;
            }
            return Ok(Value::Null);
        }
        if let Some(resource) = method.strip_suffix(".[take]") {
            return self.take(resource, params);
        }
        let (interface, _, function) = self
            .export_of(method)
            .ok_or_else(|| rpc_error(-32601, format!("method not found: {method}")))?;
        let result = self.call(&interface, &function, params)?;
        self.result_json(&function, result)
    }

    /// `next` until the end, an error, or `max` outputs, in one answer.
    fn take(&mut self, resource: &str, params: &Value) -> std::result::Result<Value, Value> {
        let (interface, _, function) = self
            .export_of(&format!("{resource}.next"))
            .ok_or_else(|| rpc_error(-32601, format!("method not found: {resource}.[take]")))?;
        let max = params["max"].as_u64().unwrap_or(1).max(1);
        let call_params = json!({ "self": params["self"] });
        let mut outputs = Vec::new();
        while (outputs.len() as u64) < max {
            let result = self.call(&interface, &function, &call_params)?;
            match self.result_json(&function, result) {
                Ok(Value::Null) => return Ok(json!({ "outputs": outputs, "done": true })),
                // `next` gives an option: `{ "some": v }` for an option of json, else the value.
                Ok(value) => outputs.push(match value.get("some") {
                    Some(inner)
                        if value.as_object().is_some_and(|o| o.len() == 1)
                            && is_option_of_json(&self.spec, &function) =>
                    {
                        inner.clone()
                    }
                    _ => value,
                }),
                Err(error) if error["code"] == -32000 && !error["data"].is_null() => {
                    return Ok(json!({ "outputs": outputs, "done": true, "error": error["data"] }));
                }
                Err(error) => return Err(error),
            }
        }
        Ok(json!({ "outputs": outputs, "done": false }))
    }
}

fn is_option_of_json(spec: &Spec, function: &Function) -> bool {
    let Some(TypeDefKind::Result(r)) = function.result.as_ref().and_then(|ty| spec.kind_of(ty))
    else {
        return false;
    };
    matches!(r.ok.as_ref().and_then(|ty| spec.kind_of(ty)), Some(TypeDefKind::Option(inner)) if spec.is_json(inner))
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn main() -> Result<()> {
    let args = args()?;
    let spec = Arc::new(Spec::load(&args.wit, &args.world)?);
    let mut config = Config::new();
    config.epoch_interruption(true);
    let engine = Engine::new(&config)?;
    let ticker = engine.clone();
    std::thread::spawn(move || loop {
        std::thread::sleep(TICK);
        ticker.increment_epoch();
    });
    let io = Arc::new(Mutex::new(Io {
        input: BufReader::new(std::io::stdin()),
        output: std::io::stdout(),
    }));
    let mut host = Host {
        args,
        engine,
        io: io.clone(),
        spec,
        live: None,
        stopped: None,
    };
    loop {
        let message = io
            .lock()
            .map_err(|_| format_err!("the JSON-RPC connection is broken"))?
            .recv()?;
        let Some(message) = message else {
            return Ok(());
        };
        let Some(method) = message["method"].as_str().map(String::from) else {
            continue;
        };
        let reply = host.dispatch(&method, &message["params"]);
        let Some(id) = message.get("id") else {
            continue;
        };
        let answer = match reply {
            Ok(result) => json!({ "jsonrpc": "2.0", "id": id, "result": result }),
            Err(error) => json!({ "jsonrpc": "2.0", "id": id, "error": error }),
        };
        io.lock()
            .map_err(|_| format_err!("the JSON-RPC connection is broken"))?
            .send(&answer)?;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn codec() -> Codec {
        let wit = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../spec/wit");
        Codec(Arc::new(Spec::load(&wit, "action-bundle").unwrap()))
    }

    fn store() -> Store<State> {
        let state = State {
            io: Arc::new(Mutex::new(Io {
                input: BufReader::new(std::io::stdin()),
                output: std::io::stdout(),
            })),
            limiter: Limiter {
                cap: 1 << 20,
                total: 0,
                refused: false,
            },
            next_call: 0,
            budget: Duration::from_secs(1),
            slice: Instant::now(),
            guest_handles: HashMap::new(),
            next_handle: 1,
            bundle: Arc::new(String::new()),
        };
        Store::new(&Engine::default(), state)
    }

    fn function(codec: &Codec, interfaces: &HashMap<String, InterfaceId>, name: &str) -> Function {
        let (interface, function) = name.split_once('.').unwrap();
        let id = interfaces
            .values()
            .find(|id| codec.spec().interface_name(**id) == interface)
            .unwrap();
        codec.spec().resolve.interfaces[*id].functions[function].clone()
    }

    #[test]
    fn http_request_params_keep_the_json_rpc_md_form() {
        let codec = codec();
        let mut store = store();
        let request = function(&codec, &codec.spec().imports, "http.request");
        for params in [
            json!({"request":{"method":"POST","target":{"tag":"path","val":"/query"},"query":[],"headers":[],"body":{"page_size":2}}}),
            json!({"request":{"method":"GET","target":{"tag":"url","val":"https://a.example/x"},"query":[["id","a"],["id","b"]],"headers":[],"body":null,"timeoutMs":5,"retry":false}}),
        ] {
            let vals = codec
                .params_val_of(&mut store.as_context_mut(), &request, &params)
                .unwrap();
            let back = codec
                .params_json_of(&mut store.as_context_mut(), &request, &vals)
                .unwrap();
            assert_eq!(back, params);
        }
    }

    #[test]
    fn http_response_result_keeps_the_json_rpc_md_form() {
        let codec = codec();
        let mut store = store();
        let request = function(&codec, &codec.spec().imports, "http.request");
        let Some(TypeDefKind::Result(result)) =
            codec.spec().kind_of(request.result.as_ref().unwrap())
        else {
            panic!("http.request has no result");
        };
        let ok = result.ok.unwrap();
        let response = json!({"status":200,"headers":[["content-type","application/json"]],"body":{"results":[]}});
        let val = codec
            .val_of(&mut store.as_context_mut(), &ok, &response)
            .unwrap();
        let back = codec
            .json_of(&mut store.as_context_mut(), &ok, val)
            .unwrap();
        assert_eq!(back, response);
    }

    #[test]
    fn an_option_of_json_in_a_result_is_wrapped_in_some() {
        let codec = codec();
        let mut store = store();
        let next = function(&codec, &codec.spec().exports, "action.[method]run.next");
        let Some(TypeDefKind::Result(result)) = codec.spec().kind_of(next.result.as_ref().unwrap())
        else {
            panic!("next has no result");
        };
        let ok = result.ok.unwrap();
        let some = Val::Option(Some(Box::new(Val::String("null".into()))));
        assert_eq!(
            codec
                .json_of(&mut store.as_context_mut(), &ok, some)
                .unwrap(),
            json!({ "some": null })
        );
        assert_eq!(
            codec
                .json_of(&mut store.as_context_mut(), &ok, Val::Option(None))
                .unwrap(),
            Value::Null
        );
    }

    #[test]
    fn a_u64_above_2_53_is_an_error() {
        let codec = codec();
        let mut store = store();
        let above = MAX_SAFE_INTEGER + 1;
        assert!(codec
            .val_of(&mut store.as_context_mut(), &Type::U64, &json!(above))
            .is_err());
        assert!(codec
            .json_of(&mut store.as_context_mut(), &Type::U64, Val::U64(above))
            .is_err());
    }

    #[test]
    fn capabilities_are_host_resources_of_an_action_and_guest_resources_of_a_provider() {
        let wit = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../spec/wit");
        let resources = |world: &str| {
            let spec = Spec::load(&wit, world).unwrap();
            let mut names: Vec<String> = spec
                .host_resources
                .keys()
                .filter_map(|id| spec.resolve.types[*id].name.clone())
                .collect();
            names.sort();
            names
        };
        assert!(resources("action-bundle").contains(&"chat-model".to_string()));
        assert!(resources("action-bundle").contains(&"binary-writer".to_string()));
        assert_eq!(resources("provider-bundle"), Vec::<String>::new());
        let provider = Spec::load(&wit, "provider-bundle").unwrap();
        let mut exports: Vec<&str> = provider
            .exports
            .values()
            .map(|id| provider.interface_name(*id))
            .collect();
        exports.sort();
        assert_eq!(exports, ["capabilities", "provider"]);
    }

    #[test]
    fn kebab_names_become_lower_camel_case() {
        assert_eq!(camel("timeout-ms"), "timeoutMs");
        assert_eq!(camel("is-not-empty"), "isNotEmpty");
    }
}

"use strict";

const {
	lua,
	lauxlib,
	lualib,
	to_luastring
} = require('fengari');
const {
	LUA_MULTRET,
	LUA_OK,
	LUA_REGISTRYINDEX,
	LUA_RIDX_MAINTHREAD,
	LUA_TBOOLEAN,
	LUA_TFUNCTION,
	LUA_TLIGHTUSERDATA,
	LUA_TNIL,
	LUA_TNONE,
	LUA_TNUMBER,
	LUA_TSTRING,
	LUA_TTABLE,
	LUA_TTHREAD,
	LUA_TUSERDATA,
	lua_atnativeerror,
	lua_call,
	lua_getfield,
	lua_gettable,
	lua_gettop,
	lua_isnil,
	lua_isproxy,
	lua_newuserdata,
	lua_pcall,
	lua_pop,
	lua_pushboolean,
	lua_pushcfunction,
	lua_pushinteger,
	lua_pushlightuserdata,
	lua_pushliteral,
	lua_pushnil,
	lua_pushnumber,
	lua_pushstring,
	lua_pushvalue,
	lua_rawgeti,
	lua_rawgetp,
	lua_rawsetp,
	lua_rotate,
	lua_setfield,
	lua_settable,
	lua_settop,
	lua_toboolean,
	lua_tojsstring,
	lua_tonumber,
	lua_toproxy,
	lua_tothread,
	lua_touserdata,
	lua_type
} = lua;
const {
	luaL_argerror,
	luaL_checkany,
	luaL_checkoption,
	luaL_checkstack,
	luaL_checkudata,
	luaL_error,
	luaL_getmetafield,
	luaL_newlib,
	luaL_newmetatable,
	luaL_requiref,
	luaL_setfuncs,
	luaL_setmetatable,
	luaL_testudata,
	luaL_tolstring
} = lauxlib;
const {
	luaopen_base
} = lualib;

const FENGARI_INTEROP_VERSION_MAJOR   = "0";
const FENGARI_INTEROP_VERSION_MINOR   = "1";
const FENGARI_INTEROP_VERSION_NUM     = 1;
const FENGARI_INTEROP_VERSION_RELEASE = "3";
const FENGARI_INTEROP_VERSION         = FENGARI_INTEROP_VERSION_MAJOR + "." + FENGARI_INTEROP_VERSION_MINOR;
const FENGARI_INTEROP_RELEASE         = FENGARI_INTEROP_VERSION + "." + FENGARI_INTEROP_VERSION_RELEASE;

let custom_inspect_symbol;
if (typeof process !== "undefined") {
	try { /* for node.js */
		custom_inspect_symbol = require('util').inspect.custom;
	} catch (e) {}
}

const global_env = (function() {
	if (typeof process !== "undefined") {
		/* node */
		return global;
	} else if (typeof window !== "undefined") {
		/* browser window */
		return window;
	} else if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
		/* web worker */
		return self;
	} else {
		/* unknown global env */
		return (0, eval)('this'); /* use non-strict mode to get global env */
	}
})();

let apply, construct, Reflect_deleteProperty;
if (typeof Reflect !== "undefined") {
	apply = Reflect.apply;
	construct = Reflect.construct;
	Reflect_deleteProperty = Reflect.deleteProperty;
} else {
	const fApply = Function.apply;
	const bind = Function.bind;
	apply = function(target, thisArgument, argumentsList) {
		return fApply.call(target, thisArgument, argumentsList);
	};
	construct = function(target, argumentsList /*, newTarget */) {
		switch (argumentsList.length) {
			case 0: return new target();
			case 1: return new target(argumentsList[0]);
			case 2: return new target(argumentsList[0], argumentsList[1]);
			case 3: return new target(argumentsList[0], argumentsList[1], argumentsList[2]);
			case 4: return new target(argumentsList[0], argumentsList[1], argumentsList[2], argumentsList[3]);
		}
		let args = [null];
		args.push.apply(args, argumentsList);
		return new (bind.apply(target, args))();
	};
	/* need to be in non-strict mode */
	Reflect_deleteProperty = Function("t", "k", "delete t[k]");
}

/*
String.concat coerces to string with correct hint for Symbol.toPrimitive
`this` isn't allowed to be null, so bind the empty string
*/
const toString = String.prototype.concat.bind("");

const isobject = function(o) {
	return typeof o === "object" ? o !== null : typeof o === "function";
};

const js_tname = to_luastring("js object");
const js_library_not_loaded = "js library not loaded into lua_State";

const testjs = function(L, idx) {
	let u = luaL_testudata(L, idx, js_tname);
	if (u)
		return u.data;
	else
		return void 0;
};

const checkjs = function(L, idx) {
	return luaL_checkudata(L, idx, js_tname).data;
};

const pushjs = function(L, v) {
	let b = lua_newuserdata(L);
	b.data = v;
	luaL_setmetatable(L, js_tname);
};

const getmainthread = function(L) {
	lua_rawgeti(L, LUA_REGISTRYINDEX, LUA_RIDX_MAINTHREAD);
	let mainL = lua_tothread(L, -1);
	lua_pop(L, 1);
	return mainL;
};

/* weak map from states to proxy objects (for each object) in that state */
const states = new WeakMap();

const push = function(L, v) {
	switch (typeof v) {
		case "undefined":
			lua_pushnil(L);
			break;
		case "number":
			lua_pushnumber(L, v);
			break;
		case "string":
			lua_pushstring(L, to_luastring(v));
			break;
		case "boolean":
			lua_pushboolean(L, v);
			break;
		case "symbol":
			lua_pushlightuserdata(L, v);
			break;
		case "function":
			if (lua_isproxy(v, L)) {
				v(L);
				break;
			}
			/* fall through */
		case "object":
			if (v === null) {
				/* can't use null in a WeakMap; grab from registry */
				if (lua_rawgetp(L, LUA_REGISTRYINDEX, null) !== LUA_TUSERDATA)
					throw Error(js_library_not_loaded);
				break;
			}
			/* fall through */
		default: {
			/* Try and push same object again */
			let objects_seen = states.get(getmainthread(L));
			if (!objects_seen) throw Error(js_library_not_loaded);
			let p = objects_seen.get(v);
			if (p) {
				p(L);
			} else {
				pushjs(L, v);
				p = lua_toproxy(L, -1);
				objects_seen.set(v, p);
			}
		}
	}
};

const atnativeerror = function(L) {
	let u = lua_touserdata(L, 1);
	push(L, u);
	return 1;
};

const tojs = function(L, idx) {
	switch(lua_type(L, idx)) {
		case LUA_TNONE:
		case LUA_TNIL:
			return void 0;
		case LUA_TBOOLEAN:
			return lua_toboolean(L, idx);
		case LUA_TLIGHTUSERDATA:
			return lua_touserdata(L, idx);
		case LUA_TNUMBER:
			return lua_tonumber(L, idx);
		case LUA_TSTRING:
			return lua_tojsstring(L, idx);
		case LUA_TUSERDATA: {
			let u = testjs(L, idx);
			if (u !== void 0)
				return u;
		}
		/* fall through */
		case LUA_TTABLE:
		case LUA_TFUNCTION:
		case LUA_TTHREAD:
		/* fall through */
		default:
			return wrap(L, lua_toproxy(L, idx));
	}
};

/* Calls function on the stack with `nargs` from the stack.
   On lua error, re-throws as javascript error
   On success, returns single return value */
const jscall = function(L, nargs) {
	let status = lua_pcall(L, nargs, 1, 0);
	let r = tojs(L, -1);
	lua_pop(L, 1);
	switch(status) {
		case LUA_OK:
			return r;
		default:
			throw r;
	}
};

const invoke = function(L, p, thisarg, args, n_results) {
	if (!isobject(args)) throw new TypeError("`args` argument must be an object");
	let length = +args.length;
	if (!(length >= 0)) length = 0; /* Keep NaN in mind */
	luaL_checkstack(L, 2+length, null);
	let base = lua_gettop(L);
	p(L);
	push(L, thisarg);
	for (let i=0; i<length; i++) {
		push(L, args[i]);
	}
	switch(lua_pcall(L, 1+length, n_results, 0)) {
		case LUA_OK: {
			let nres = lua_gettop(L)-base;
			let res = new Array(nres);
			for (let i=0; i<nres; i++) {
				res[i] = tojs(L, base+i+1);
			}
			lua_settop(L, base);
			return res;
		}
		default: {
			let r = tojs(L, -1);
			lua_settop(L, base);
			throw r;
		}
	}
};

const gettable = function(L) {
	lua_gettable(L, 1);
	return 1;
};

const get = function(L, p, prop) {
	luaL_checkstack(L, 3, null);
	lua_pushcfunction(L, gettable);
	p(L);
	push(L, prop);
	return jscall(L, 2);
};

const has = function(L, p, prop) {
	luaL_checkstack(L, 3, null);
	lua_pushcfunction(L, gettable);
	p(L);
	push(L, prop);
	let status = lua_pcall(L, 2, 1, 0);
	switch(status) {
		case LUA_OK: {
			let r = lua_isnil(L, -1);
			lua_pop(L, 1);
			return !r;
		}
		default: {
			let r = tojs(L, -1);
			lua_pop(L, 1);
			throw r;
		}
	}
};

const set = function(L, p, prop, value) {
	luaL_checkstack(L, 4, null);
	lua_pushcfunction(L, function(L) {
		lua_settable(L, 1);
		return 0;
	});
	p(L);
	push(L, prop);
	push(L, value);
	switch(lua_pcall(L, 3, 0, 0)) {
		case LUA_OK:
			return;
		default: {
			let r = tojs(L, -1);
			lua_pop(L, 1);
			throw r;
		}
	}
};

const deleteProperty = function(L, p, prop) {
	luaL_checkstack(L, 4, null);
	lua_pushcfunction(L, function(L) {
		lua_settable(L, 1);
		return 0;
	});
	p(L);
	push(L, prop);
	lua_pushnil(L);
	switch(lua_pcall(L, 3, 0, 0)) {
		case LUA_OK:
			return;
		default: {
			let r = tojs(L, -1);
			lua_pop(L, 1);
			throw r;
		}
	}
};

const tostring = function(L, p) {
	luaL_checkstack(L, 2, null);
	lua_pushcfunction(L, function(L) {
		luaL_tolstring(L, 1);
		return 1;
	});
	p(L);
	return jscall(L, 1);
};

/* implements lua's "Generic For" protocol */
const iter_next = function() {
	let L = this.L;
	luaL_checkstack(L, 3, null);
	let top = lua_gettop(L);
	this.iter(L);
	this.state(L);
	this.last(L);
	switch(lua_pcall(L, 2, LUA_MULTRET, 0)) {
		case LUA_OK: {
			this.last = lua_toproxy(L, top+1);
			let r;
			if (lua_isnil(L, -1)) {
				r = {
					done: true,
					value: void 0
				};
			} else {
				let n_results = lua_gettop(L) - top;
				let result = new Array(n_results);
				for (let i=0; i<n_results; i++) {
					result[i] = tojs(L, top+i+1);
				}
				r = {
					done: false,
					value: result
				};
			}
			lua_settop(L, top);
			return r;
		}
		default: {
			let e = tojs(L, -1);
			lua_pop(L, 1);
			throw e;
		}
	}
};

/* make iteration use pairs() */
const jsiterator = function(L, p) {
	luaL_checkstack(L, 1, null);
	lua_pushcfunction(L, function(L) {
		luaL_requiref(L, to_luastring("_G"), luaopen_base, 0);
		lua_getfield(L, -1, to_luastring("pairs"));
		p(L);
		lua_call(L, 1, 3);
		return 3;
	});
	switch(lua_pcall(L, 0, 3, 0)) {
		case LUA_OK: {
			let iter = lua_toproxy(L, -3);
			let state = lua_toproxy(L, -2);
			let last = lua_toproxy(L, -1);
			lua_pop(L, 3);
			return {
				L: L,
				iter: iter,
				state: state,
				last: last,
				next: iter_next
			};
		}
		default: {
			let r = tojs(L, -1);
			lua_pop(L, 1);
			throw r;
		}
	}
};

const wrap = function(L1, p) {
	const L = getmainthread(L1);
	/* we need `typeof js_proxy` to be "function" so that it's acceptable to native apis */
	let js_proxy = function() {
		/* only get one result */
		return invoke(L, p, this, arguments, 1)[0];
	};
	js_proxy.apply = function(thisarg, args) {
		/* only get one result */
		return invoke(L, p, thisarg, args, 1)[0];
	};
	js_proxy.invoke = function(thisarg, args) {
		return invoke(L, p, thisarg, args, LUA_MULTRET);
	};
	js_proxy.get = function(k) {
		return get(L, p, k);
	};
	js_proxy.has = function(k) {
		return has(L, p, k);
	};
	js_proxy.set = function(k, v) {
		return set(L, p, k, v);
	};
	js_proxy.delete = function(k) {
		return deleteProperty(L, p, k);
	};
	js_proxy.toString = function() {
		return tostring(L, p);
	};
	if (typeof Symbol === "function") {
		js_proxy[Symbol.toStringTag] = "Fengari object";
		js_proxy[Symbol.iterator] = function() {
			return jsiterator(L, p);
		};
		if (Symbol.toPrimitive) {
			js_proxy[Symbol.toPrimitive] = function(hint) {
				if (hint === "string") {
					return tostring(L, p);
				}
			};
		}
	}
	if (custom_inspect_symbol) {
		js_proxy[custom_inspect_symbol] = js_proxy.toString;
	}
	let objects_seen = states.get(L);
	if (!objects_seen) throw Error(js_library_not_loaded);
	objects_seen.set(js_proxy, p);
	return js_proxy;
};

const jslib = {
	"new": function(L) {
		let u = tojs(L, 1);
		let nargs = lua_gettop(L)-1;
		let args = new Array(nargs);
		for (let i = 0; i < nargs; i++) {
			args[i] = tojs(L, i+2);
		}
		push(L, construct(u, args));
		return 1;
	},
	"tonumber": function(L) {
		let u = tojs(L, 1);
		lua_pushnumber(L, +u);
		return 1;
	},
	"tostring": function(L) {
		let u = tojs(L, 1);
		lua_pushliteral(L, toString(u));
		return 1;
	},
	"instanceof": function(L) {
		let u1 = tojs(L, 1);
		let u2 = tojs(L, 2);
		lua_pushboolean(L, u1 instanceof u2);
		return 1;
	},
	"typeof": function(L) {
		let u = tojs(L, 1);
		lua_pushliteral(L, typeof u);
		return 1;
	}
};

if (typeof Symbol === "function" && Symbol.iterator) {
	const get_iterator = function(L, idx) {
		let u = checkjs(L, idx);
		let getiter = u[Symbol.iterator];
		if (!getiter)
			luaL_argerror(L, idx, to_luastring("object not iterable"));
		let iter = apply(getiter, u, []);
		if (!isobject(iter))
			luaL_argerror(L, idx, to_luastring("Result of the Symbol.iterator method is not an object"));
		return iter;
	};

	const next = function(L) {
		let iter = tojs(L, 1);
		let r = iter.next();
		if (r.done) {
			return 0;
		} else {
			push(L, r.value);
			return 1;
		}
	};

	jslib["of"] = function(L) {
		let iter = get_iterator(L, 1);
		lua_pushcfunction(L, next);
		push(L, iter);
		return 2;
	};
}

if (typeof Proxy === "function" && typeof Symbol === "function") {
	const L_symbol = Symbol("lua_State");
	const p_symbol = Symbol("fengari-proxy");

	const proxy_handlers = {
		"apply": function(target, thisarg, args) {
			return invoke(target[L_symbol], target[p_symbol], thisarg, args, 1)[0];
		},
		"construct": function(target, argumentsList) {
			let L = target[L_symbol];
			let p = target[p_symbol];
			let arg_length = argumentsList.length;
			luaL_checkstack(L, 2+arg_length, null);
			p(L);
			let idx = lua_gettop(L);
			if (luaL_getmetafield(L, idx, to_luastring("construct")) === LUA_TNIL) {
				lua_pop(L, 1);
				throw new TypeError("not a constructor");
			}
			lua_rotate(L, idx, 1);
			for (let i=0; i<arg_length; i++) {
				push(L, argumentsList[i]);
			}
			return jscall(L, 1+arg_length);
		},
		"defineProperty": function(target, prop, desc) {
			let L = target[L_symbol];
			let p = target[p_symbol];
			luaL_checkstack(L, 4, null);
			p(L);
			if (luaL_getmetafield(L, -1, to_luastring("defineProperty")) === LUA_TNIL) {
				lua_pop(L, 1);
				return false;
			}
			lua_rotate(L, -2, 1);
			push(L, prop);
			push(L, desc);
			return jscall(L, 3);
		},
		"deleteProperty": function(target, k) {
			return deleteProperty(target[L_symbol], target[p_symbol], k);
		},
		"get": function(target, k) {
			return get(target[L_symbol], target[p_symbol], k);
		},
		"getOwnPropertyDescriptor": function(target, prop) {
			let L = target[L_symbol];
			let p = target[p_symbol];
			luaL_checkstack(L, 3, null);
			p(L);
			if (luaL_getmetafield(L, -1, to_luastring("getOwnPropertyDescriptor")) === LUA_TNIL) {
				lua_pop(L, 1);
				return;
			}
			lua_rotate(L, -2, 1);
			push(L, prop);
			return jscall(L, 2);
		},
		"getPrototypeOf": function(target) {
			let L = target[L_symbol];
			let p = target[p_symbol];
			luaL_checkstack(L, 2, null);
			p(L);
			if (luaL_getmetafield(L, -1, to_luastring("getPrototypeOf")) === LUA_TNIL) {
				lua_pop(L, 1);
				return null;
			}
			lua_rotate(L, -2, 1);
			return jscall(L, 1);
		},
		"has": function(target, k) {
			return has(target[L_symbol], target[p_symbol], k);
		},
		"ownKeys": function(target) {
			let L = target[L_symbol];
			let p = target[p_symbol];
			luaL_checkstack(L, 2, null);
			p(L);
			if (luaL_getmetafield(L, -1, to_luastring("ownKeys")) === LUA_TNIL) {
				lua_pop(L, 1);
				throw Error("ownKeys unknown for fengari object");
			}
			lua_rotate(L, -2, 1);
			return jscall(L, 1);
		},
		"set": function(target, k, v) {
			set(target[L_symbol], target[p_symbol], k, v);
			return true;
		},
		"setPrototypeOf": function(target, prototype) {
			let L = target[L_symbol];
			let p = target[p_symbol];
			luaL_checkstack(L, 3, null);
			p(L);
			if (luaL_getmetafield(L, -1, to_luastring("setPrototypeOf")) === LUA_TNIL) {
				lua_pop(L, 1);
				return false;
			}
			lua_rotate(L, -2, 1);
			push(L, prototype);
			return jscall(L, 2);
		}
	};

	/*
	Functions created with `function(){}` have a non-configurable .prototype
	field. This causes issues with the .ownKeys and .getOwnPropertyDescriptor
	traps.
	However using `.bind()` returns a function without the .prototype property.

	```js
	Reflect.ownKeys((function(){})) // Array [ "prototype", "length", "name" ]
	Reflect.ownKeys((function(){}).bind()) // Array [ "length", "name" ]
	```
	*/
	const raw_function = function() {
		let f = (function(){}).bind();
		delete f.length;
		delete f.name;
		return f;
	};

	/*
	We use Function() here to get prevent transpilers from converting to a
	non-arrow function.
	To avoid setting off strict CSP rules, we only call Function lazily.
	Additionally, we avoid setting the internal name field by never giving the
	new function a name in the block it was defined (and instead delete-ing
	the configurable fields .length and .name in a wrapper function)
	*/
	let make_arrow_function = function() {
		make_arrow_function = Function("return ()=>void 0;");
		return make_arrow_function();
	};
	const raw_arrow_function = function() {
		let f = make_arrow_function();
		delete f.length;
		delete f.name;
		return f;
	};

	/*
	Arrow functions do not have a .prototype field:

	```js
	Reflect.ownKeys((() = >void 0)) // Array [ "length", "name" ]
	```

	However they cannot be used as a constructor:

	```js
	new (new Proxy(() => void 0, { construct: function() { return {}; } })) // TypeError: (intermediate value) is not a constructor
	new (new Proxy(function(){}, { construct: function() { return {}; } })) // {}
	```
	*/
	const createproxy = function(L1, p, type) {
		const L = getmainthread(L1);
		let target;
		switch (type) {
			case "function":
				target = raw_function();
				break;
			case "arrow_function":
				target = raw_arrow_function();
				break;
			case "object":
				target = {};
				break;
			default:
				throw TypeError("invalid type to createproxy");
		}
		target[p_symbol] = p;
		target[L_symbol] = L;
		return new Proxy(target, proxy_handlers);
	};

	const valid_types = ["function", "arrow_function", "object"];
	const valid_types_as_luastring = valid_types.map((v) => to_luastring(v));
	jslib["createproxy"] = function(L) {
		luaL_checkany(L, 1);
		let type = valid_types[luaL_checkoption(L, 2, valid_types_as_luastring[0], valid_types_as_luastring)];
		let fengariProxy = createproxy(L, lua_toproxy(L, 1), type);
		push(L, fengariProxy);
		return 1;
	};
}

let jsmt = {
	"__index": function(L) {
		let u = checkjs(L, 1);
		let k = tojs(L, 2);
		push(L, u[k]);
		return 1;
	},
	"__newindex": function(L) {
		let u = checkjs(L, 1);
		let k = tojs(L, 2);
		let v = tojs(L, 3);
		if (v === void 0)
			Reflect_deleteProperty(u, k);
		else
			u[k] = v;
		return 0;
	},
	"__tostring": function(L) {
		let u = checkjs(L, 1);
		let s = toString(u);
		lua_pushstring(L, to_luastring(s));
		return 1;
	},
	"__call": function(L) {
		let u = checkjs(L, 1);
		let nargs = lua_gettop(L)-1;
		let thisarg;
		let args = new Array(Math.max(0, nargs-1));
		if (nargs > 0) {
			thisarg = tojs(L, 2);
			if (nargs-- > 0) {
				for (let i = 0; i < nargs; i++) {
					args[i] = tojs(L, i+3);
				}
			}
		}
		push(L, apply(u, thisarg, args));
		return 1;
	},
	"__pairs": function(L) {
		let u = checkjs(L, 1);
		let f;
		let iter, state, first;
		if (typeof Symbol !== "function" || (f = u[Symbol.for("__pairs")]) === void 0) {
			/* By default, iterate over Object.keys */
			iter = function(last) {
				if (this.index >= this.keys.length)
					return;
				let key = this.keys[this.index++];
				return [key, this.object[key]];
			};
			state = {
				object: u,
				keys: Object.keys(u),
				index: 0,
			};
		} else {
			let r = apply(f, u, []);
			if (r === void 0)
				luaL_error(L, to_luastring("bad '__pairs' result (object with keys 'iter', 'state', 'first' expected)"));
			iter = r.iter;
			if (iter === void 0)
				luaL_error(L, to_luastring("bad '__pairs' result (object.iter is missing)"));
			state = r.state;
			first = r.first;
		}
		lua_pushcfunction(L, function() {
			let state = tojs(L, 1);
			let last = tojs(L, 2);
			let r = apply(iter, state, [last]);
			/* returning undefined indicates end of iteration */
			if (r === void 0)
				return 0;
			/* otherwise it should return an array of results */
			if (!Array.isArray(r))
				luaL_error(L, to_luastring("bad iterator result (Array or undefined expected)"));
			luaL_checkstack(L, r.length, null);
			for (let i=0; i<r.length; i++) {
				push(L, r[i]);
			}
			return r.length;
		});
		push(L, state);
		push(L, first);
		return 3;
	},
	"__len": function(L) {
		let u = checkjs(L, 1);
		let f;
		let r;
		if (typeof Symbol !== "function" || (f = u[Symbol.for("__len")]) === void 0) {
			/* by default use .length field */
			r = u.length;
		} else {
			r = apply(f, u, []);
		}
		push(L, r);
		return 1;
	}
};

const luaopen_js = function(L) {
	/* Add weak map to track objects seen */
	states.set(getmainthread(L), new WeakMap());

	lua_atnativeerror(L, atnativeerror);

	luaL_newlib(L, jslib);
	lua_pushliteral(L, FENGARI_INTEROP_VERSION);
	lua_setfield(L, -2, to_luastring("_VERSION"));
	lua_pushinteger(L, FENGARI_INTEROP_VERSION_NUM);
	lua_setfield(L, -2, to_luastring("_VERSION_NUM"));
	lua_pushliteral(L, FENGARI_INTEROP_RELEASE);
	lua_setfield(L, -2, to_luastring("_RELEASE"));

	luaL_newmetatable(L, js_tname);
	luaL_setfuncs(L, jsmt, 0);
	lua_pop(L, 1);

	pushjs(L, null);
	/* Store null object in registry under lightuserdata null */
	lua_pushvalue(L, -1);
	lua_rawsetp(L, LUA_REGISTRYINDEX, null);
	lua_setfield(L, -2, to_luastring("null"));

	push(L, global_env);
	lua_setfield(L, -2, to_luastring("global"));

	return 1;
};

module.exports.FENGARI_INTEROP_VERSION = FENGARI_INTEROP_VERSION;
module.exports.FENGARI_INTEROP_VERSION_NUM = FENGARI_INTEROP_VERSION_NUM;
module.exports.FENGARI_INTEROP_RELEASE = FENGARI_INTEROP_RELEASE;
module.exports.checkjs = checkjs;
module.exports.testjs = testjs;
module.exports.pushjs = pushjs;
module.exports.push = push;
module.exports.tojs = tojs;
module.exports.luaopen_js = luaopen_js;

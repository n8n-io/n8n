import "./_browser-chunks/chunk-4BE7D4DS.js";

// src/docs/sourceDecorator.ts
import { SourceType } from "storybook/internal/docs-tools";
import { emitTransformCode, useEffect } from "storybook/preview-api";
import { isVNode } from "vue";
var TRACKING_SYMBOL = Symbol("DEEP_ACCESS_SYMBOL"), isProxy = (obj) => !!(obj && typeof obj == "object" && TRACKING_SYMBOL in obj), sourceDecorator = (storyFn, ctx) => {
  let story = storyFn();
  return useEffect(() => {
    let sourceCode = generateSourceCode(ctx);
    shouldSkipSourceCodeGeneration(ctx) || emitTransformCode(sourceCode, ctx);
  }), story;
}, generateSourceCode = (ctx) => {
  let sourceCodeContext = {
    imports: {},
    scriptVariables: {}
  }, { displayName, slotNames, eventNames } = parseDocgenInfo(ctx.component), props = generatePropsSourceCode(ctx.args, slotNames, eventNames, sourceCodeContext), slotSourceCode = generateSlotSourceCode(ctx.args, slotNames, sourceCodeContext), componentName = displayName || ctx.title.split("/").at(-1), templateCode = slotSourceCode ? `<${componentName} ${props}> ${slotSourceCode} </${componentName}>` : `<${componentName} ${props} />`, variablesCode = Object.entries(sourceCodeContext.scriptVariables).map(([name, value]) => `const ${name} = ${value};`).join(`

`), importsCode = Object.entries(sourceCodeContext.imports).map(([packageName, imports]) => `import { ${Array.from(imports.values()).sort().join(", ")} } from "${packageName}";`).join(`
`), template = `<template>
  ${templateCode}
</template>`;
  return !importsCode && !variablesCode ? template : `<script lang="ts" setup>
${importsCode ? `${importsCode}

${variablesCode}` : variablesCode}
<\/script>

${template}`;
}, shouldSkipSourceCodeGeneration = (context) => {
  let sourceParams = context?.parameters.docs?.source;
  return sourceParams?.type === SourceType.DYNAMIC ? !1 : !context?.parameters.__isArgsStory || sourceParams?.code || sourceParams?.type === SourceType.CODE;
}, parseDocgenInfo = (component) => {
  if (!component || !("__docgenInfo" in component) || !component.__docgenInfo || typeof component.__docgenInfo != "object")
    return {
      displayName: component?.__name,
      eventNames: [],
      slotNames: []
    };
  let docgenInfo = component.__docgenInfo, displayName = "displayName" in docgenInfo && typeof docgenInfo.displayName == "string" ? docgenInfo.displayName : void 0, parseNames = (key) => !(key in docgenInfo) || !Array.isArray(docgenInfo[key]) ? [] : docgenInfo[key].map((i) => i && typeof i == "object" && "name" in i ? i.name : void 0).filter((i) => typeof i == "string");
  return {
    displayName: displayName || component.__name,
    slotNames: parseNames("slots").sort((a, b) => a === "default" ? -1 : b === "default" ? 1 : a.localeCompare(b)),
    eventNames: parseNames("events")
  };
}, generatePropsSourceCode = (args, slotNames, eventNames, ctx) => {
  let properties = [];
  Object.entries(args).forEach(([propName, value]) => {
    if (!slotNames.includes(propName) && value != null)
      switch (isProxy(value) && (value = value.toString()), typeof value) {
        case "string":
          if (value === "")
            return;
          properties.push({
            name: propName,
            value: value.includes('"') ? `'${value}'` : `"${value}"`,
            templateFn: (name, propValue) => `${name}=${propValue}`
          });
          break;
        case "number":
          properties.push({
            name: propName,
            value: value.toString(),
            templateFn: (name, propValue) => `:${name}="${propValue}"`
          });
          break;
        case "bigint":
          properties.push({
            name: propName,
            value: `BigInt(${value.toString()})`,
            templateFn: (name, propValue) => `:${name}="${propValue}"`
          });
          break;
        case "boolean":
          properties.push({
            name: propName,
            value: value ? "true" : "false",
            templateFn: (name, propValue) => propValue === "true" ? name : `:${name}="false"`
          });
          break;
        case "symbol":
          properties.push({
            name: propName,
            value: `Symbol(${value.description ? `'${value.description}'` : ""})`,
            templateFn: (name, propValue) => `:${name}="${propValue}"`
          });
          break;
        case "object": {
          properties.push({
            name: propName,
            value: formatObject(value ?? {}),
            // to follow Vue best practices, complex values like object and arrays are
            // usually placed inside the <script setup> block instead of inlining them in the <template>
            templateFn: void 0
          });
          break;
        }
        case "function":
          break;
      }
  }), properties.sort((a, b) => a.name.localeCompare(b.name));
  let props = [];
  return properties.forEach((prop) => {
    let isVModel = eventNames.includes(`update:${prop.name}`);
    if (!isVModel && prop.templateFn) {
      props.push(prop.templateFn(prop.name, prop.value));
      return;
    }
    let variableName = prop.name;
    if (variableName in ctx.scriptVariables) {
      let index = 1;
      do
        variableName = `${prop.name}${index}`, index++;
      while (variableName in ctx.scriptVariables);
    }
    if (!isVModel) {
      ctx.scriptVariables[variableName] = prop.value, props.push(`:${prop.name}="${variableName}"`);
      return;
    }
    ctx.scriptVariables[variableName] = `ref(${prop.value})`, ctx.imports.vue || (ctx.imports.vue = /* @__PURE__ */ new Set()), ctx.imports.vue.add("ref"), prop.name === "modelValue" ? props.push(`v-model="${variableName}"`) : props.push(`v-model:${prop.name}="${variableName}"`);
  }), props.join(" ");
}, generateSlotSourceCode = (args, slotNames, ctx) => {
  let slotSourceCodes = [];
  return slotNames.forEach((slotName) => {
    let arg = args[slotName];
    if (!arg)
      return;
    let slotContent = generateSlotChildrenSourceCode([arg], ctx);
    if (!slotContent)
      return;
    let slotBindings = typeof arg == "function" ? getFunctionParamNames(arg) : [];
    slotName === "default" && !slotBindings.length ? slotSourceCodes.push(slotContent) : slotSourceCodes.push(
      `<template ${slotBindingsToString(slotName, slotBindings)}>${slotContent}</template>`
    );
  }), slotSourceCodes.join(`

`);
}, generateSlotChildrenSourceCode = (children, ctx) => {
  let slotChildrenSourceCodes = [], generateSingleChildSourceCode = (child) => {
    if (isVNode(child))
      return generateVNodeSourceCode(child, ctx);
    switch (typeof child) {
      case "string":
      case "number":
      case "boolean":
        return child.toString();
      case "object":
        return child === null ? "" : Array.isArray(child) ? child.map(generateSingleChildSourceCode).filter((code) => code !== "").join(`
`) : JSON.stringify(child);
      case "function": {
        let paramNames = getFunctionParamNames(child).filter(
          (param) => !["{", "}"].includes(param)
        ), parameters = {}, proxied = {};
        paramNames.forEach((param) => {
          parameters[param] = `{{ ${param} }}`, proxied[param] = new Proxy(
            {
              // we use the symbol to identify the proxy
              [TRACKING_SYMBOL]: !0
            },
            {
              // getter is called when any prop of the parameter is read
              get: (t, key) => key === TRACKING_SYMBOL ? t[TRACKING_SYMBOL] : [Symbol.toPrimitive, Symbol.toStringTag, "toString"].includes(key) ? () => `{{ ${param} }}` : key === "v-bind" ? `${param}` : `{{ ${param}.${key.toString()} }}`,
              // ownKeys is called, among other uses, when an object is destructured
              // in this case we assume the parameter is supposed to be bound using "v-bind"
              // Therefore we only return one special key "v-bind" and the getter will be called afterwards with it
              ownKeys: () => ["v-bind"],
              /** Called when destructured */
              getOwnPropertyDescriptor: () => ({
                configurable: !0,
                enumerable: !0,
                value: param,
                writable: !0
              })
            }
          );
        });
        let returnValue = child(proxied);
        return generateSlotChildrenSourceCode([returnValue], ctx).replaceAll(/ (\S+)="{{ (\S+) }}"/g, ' :$1="$2"');
      }
      case "bigint":
        return `{{ BigInt(${child.toString()}) }}`;
      // the only missing case here is "symbol"
      // because rendering a symbol as slot / HTML does not make sense and is not supported by Vue
      default:
        return "";
    }
  };
  return children.forEach((child) => {
    let sourceCode = generateSingleChildSourceCode(child);
    sourceCode !== "" && slotChildrenSourceCodes.push(sourceCode);
  }), slotChildrenSourceCodes.join(`
`);
}, generateVNodeSourceCode = (vnode, ctx) => {
  let componentName = getVNodeName(vnode), childrenCode = "";
  typeof vnode.children == "string" ? childrenCode = vnode.children : Array.isArray(vnode.children) ? childrenCode = generateSlotChildrenSourceCode(vnode.children, ctx) : vnode.children && (childrenCode = generateSlotSourceCode(
    vnode.children,
    // $stable is a default property in vnode.children so we need to filter it out
    // to not generate source code for it
    Object.keys(vnode.children).filter((i) => i !== "$stable"),
    ctx
  ));
  let props = vnode.props ? generatePropsSourceCode(vnode.props, [], [], ctx) : "";
  return childrenCode ? `<${componentName}${props ? ` ${props}` : ""}>${childrenCode}</${componentName}>` : `<${componentName}${props ? ` ${props}` : ""} />`;
}, getVNodeName = (vnode) => {
  if (typeof vnode.type == "string")
    return vnode.type;
  if (typeof vnode.type == "object") {
    if ("name" in vnode.type && vnode.type.name)
      return vnode.type.name;
    if ("__name" in vnode.type && vnode.type.__name)
      return vnode.type.__name;
  }
  return "component";
}, getFunctionParamNames = (func) => {
  let STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm, ARGUMENT_NAMES = /([^\s,]+)/g, fnStr = func.toString().replace(STRIP_COMMENTS, ""), result = fnStr.slice(fnStr.indexOf("(") + 1, fnStr.indexOf(")")).match(ARGUMENT_NAMES);
  return result ? result.flatMap((param) => {
    if (["{", "}"].includes(param))
      return param;
    let nonMinifiedName = param.split(":")[0].trim();
    return nonMinifiedName.startsWith("{") ? ["{", nonMinifiedName.substring(1)] : param.endsWith("}") && !nonMinifiedName.endsWith("}") ? [nonMinifiedName, "}"] : nonMinifiedName;
  }) : [];
}, slotBindingsToString = (slotName, params) => params.length ? params.length === 1 ? `#${slotName}="${params[0]}"` : `#${slotName}="{ ${params.filter((i) => !["{", "}"].includes(i)).join(", ")} }"` : `#${slotName}`, formatObject = (obj) => Object.values(obj).every(
  (value) => value == null || typeof value != "object"
) ? JSON.stringify(obj) : JSON.stringify(obj, null, 2);

// src/entry-preview-docs.ts
var decorators = [sourceDecorator];
export {
  decorators
};

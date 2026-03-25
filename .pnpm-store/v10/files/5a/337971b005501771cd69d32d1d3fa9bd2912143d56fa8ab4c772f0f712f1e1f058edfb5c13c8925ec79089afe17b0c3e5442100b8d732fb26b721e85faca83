"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const codegen_1 = require("../../compile/codegen");
const util_1 = require("../../compile/util");
const names_1 = require("../../compile/names");
const error = {
    message: "must NOT have unevaluated properties",
    params: ({ params }) => (0, codegen_1._) `{unevaluatedProperty: ${params.unevaluatedProperty}}`,
};
const def = {
    keyword: "unevaluatedProperties",
    type: "object",
    schemaType: ["boolean", "object"],
    allowUndefined: true,
    trackErrors: true,
    error,
    code(cxt) {
        const { gen, schema = cxt.it.opts.defaultUnevaluatedProperties, data, errsCount, it } = cxt;
        const isForced = cxt.schema === undefined && cxt.it.opts.defaultUnevaluatedProperties === false;
        /* istanbul ignore if */
        if (!errsCount)
            throw new Error("ajv implementation error");
        const { allErrors, props } = it;
        if (props instanceof codegen_1.Name) {
            gen.if((0, codegen_1._) `${props} !== true`, () => gen.forIn("key", data, (key) => gen.if(unevaluatedDynamic(props, key), () => unevaluatedPropCode(key))));
        }
        else if (props !== true) {
            // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
            const staticCheck = () => gen.forIn("key", data, (key) => props === undefined
                ? unevaluatedPropCode(key)
                : gen.if(unevaluatedStatic(props, key), () => unevaluatedPropCode(key)));
            if (isForced && it.errorPath.emptyStr()) {
                // $refs are compiled into functions
                // We need to check in runtime if function was called from allOf.
                // We need to check only on the top level of the function:
                // it is ensured with `it.errorPath.emptyStr()` check
                gen.if((0, codegen_1._) `${names_1.default.isAllOfVariant} === 0`, staticCheck);
            }
            else {
                staticCheck();
            }
        }
        if (!isForced) {
            // disable shot-circut for forced unevaluatedProperties=false
            // we may run or not the check in runtime so we can't short-circuit in compile-time
            it.props = true;
        }
        cxt.ok((0, codegen_1._) `${errsCount} === ${names_1.default.errors}`);
        function unevaluatedPropCode(key) {
            if (schema === false) {
                cxt.setParams({ unevaluatedProperty: key });
                cxt.error();
                if (!allErrors)
                    gen.break();
                return;
            }
            if (!(0, util_1.alwaysValidSchema)(it, schema)) {
                const valid = gen.name("valid");
                cxt.subschema({
                    keyword: "unevaluatedProperties",
                    dataProp: key,
                    dataPropType: util_1.Type.Str,
                }, valid);
                if (!allErrors)
                    gen.if((0, codegen_1.not)(valid), () => gen.break());
            }
        }
        function unevaluatedDynamic(evaluatedProps, key) {
            return (0, codegen_1._) `!${evaluatedProps} || !${evaluatedProps}[${key}]`;
        }
        function unevaluatedStatic(evaluatedProps, key) {
            const ps = [];
            for (const p in evaluatedProps) {
                if (evaluatedProps[p] === true)
                    ps.push((0, codegen_1._) `${key} !== ${p}`);
            }
            return (0, codegen_1.and)(...ps);
        }
    },
};
exports.default = def;
//# sourceMappingURL=unevaluatedProperties.js.map
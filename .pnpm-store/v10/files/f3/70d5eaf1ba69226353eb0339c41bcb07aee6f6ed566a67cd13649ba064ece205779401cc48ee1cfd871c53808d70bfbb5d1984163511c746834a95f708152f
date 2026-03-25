"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return collapseDuplicateDeclarations;
    }
});
function collapseDuplicateDeclarations() {
    return (root)=>{
        root.walkRules((node)=>{
            let seen = new Map();
            let droppable = new Set([]);
            let byProperty = new Map();
            node.walkDecls((decl)=>{
                // This could happen if we have nested selectors. In that case the
                // parent will loop over all its declarations but also the declarations
                // of nested rules. With this we ensure that we are shallowly checking
                // declarations.
                if (decl.parent !== node) {
                    return;
                }
                if (seen.has(decl.prop)) {
                    // Exact same value as what we have seen so far
                    if (seen.get(decl.prop).value === decl.value) {
                        // Keep the last one, drop the one we've seen so far
                        droppable.add(seen.get(decl.prop));
                        // Override the existing one with the new value. This is necessary
                        // so that if we happen to have more than one declaration with the
                        // same value, that we keep removing the previous one. Otherwise we
                        // will only remove the *first* one.
                        seen.set(decl.prop, decl);
                        return;
                    }
                    // Not the same value, so we need to check if we can merge it so
                    // let's collect it first.
                    if (!byProperty.has(decl.prop)) {
                        byProperty.set(decl.prop, new Set());
                    }
                    byProperty.get(decl.prop).add(seen.get(decl.prop));
                    byProperty.get(decl.prop).add(decl);
                }
                seen.set(decl.prop, decl);
            });
            // Drop all the duplicate declarations with the exact same value we've
            // already seen so far.
            for (let decl of droppable){
                decl.remove();
            }
            // Analyze the declarations based on its unit, drop all the declarations
            // with the same unit but the last one in the list.
            for (let declarations of byProperty.values()){
                let byUnit = new Map();
                for (let decl of declarations){
                    let unit = resolveUnit(decl.value);
                    if (unit === null) {
                        continue;
                    }
                    if (!byUnit.has(unit)) {
                        byUnit.set(unit, new Set());
                    }
                    byUnit.get(unit).add(decl);
                }
                for (let declarations of byUnit.values()){
                    // Get all but the last one
                    let removableDeclarations = Array.from(declarations).slice(0, -1);
                    for (let decl of removableDeclarations){
                        decl.remove();
                    }
                }
            }
        });
    };
}
let UNITLESS_NUMBER = Symbol("unitless-number");
function resolveUnit(input) {
    let result = /^-?\d*.?\d+([\w%]+)?$/g.exec(input);
    if (result) {
        var _result_;
        return (_result_ = result[1]) !== null && _result_ !== void 0 ? _result_ : UNITLESS_NUMBER;
    }
    return null;
}

/**
 * This function removes any uses of CSS variables used as an alpha channel
 *
 * This is required for selectors like `:visited` which do not allow
 * changes in opacity or external control using CSS variables.
 *
 * @param {import('postcss').Container} container
 * @param {string[]} toRemove
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "removeAlphaVariables", {
    enumerable: true,
    get: function() {
        return removeAlphaVariables;
    }
});
function removeAlphaVariables(container, toRemove) {
    container.walkDecls((decl)=>{
        if (toRemove.includes(decl.prop)) {
            decl.remove();
            return;
        }
        for (let varName of toRemove){
            if (decl.value.includes(`/ var(${varName})`)) {
                decl.value = decl.value.replace(`/ var(${varName})`, "");
            }
        }
    });
}

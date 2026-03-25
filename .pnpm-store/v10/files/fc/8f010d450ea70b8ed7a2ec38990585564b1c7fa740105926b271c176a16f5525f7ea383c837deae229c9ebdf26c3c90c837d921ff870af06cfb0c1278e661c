"use strict";
// From https://raw.githubusercontent.com/nikoskalogridis/deep-freeze/fb921b32064dce1645197be2bf975fe0385450b0/index.js
// which is sadly, no longer maintained
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepFreeze = void 0;
function deepFreeze(o) {
    if (o) {
        Object.freeze(o);
        Object.getOwnPropertyNames(o).forEach(function (prop) {
            if (o.hasOwnProperty(prop)
                && o[prop] !== null
                && (typeof o[prop] === 'object' || typeof o[prop] === 'function')
                && (o[prop].constructor !== Buffer)
                && !Object.isFrozen(o[prop])) {
                deepFreeze(o[prop]);
            }
        });
    }
    return o;
}
exports.deepFreeze = deepFreeze;
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJlZXplLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2ZyZWV6ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsdUhBQXVIO0FBQ3ZILHVDQUF1Qzs7O0FBRXZDLFNBQWdCLFVBQVUsQ0FBRSxDQUFNO0lBQ2hDLElBQUksQ0FBQyxFQUFFO1FBQ0wsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVqQixNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsSUFBSTtZQUNsRCxJQUFJLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDO21CQUNyQixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSTttQkFDaEIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxRQUFRLElBQUksT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssVUFBVSxDQUFDO21CQUM5RCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEtBQUssTUFBTSxDQUFDO21CQUNoQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7Z0JBQzVCLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzthQUNyQjtRQUNMLENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFFRCxPQUFPLENBQUMsQ0FBQztBQUNYLENBQUM7QUFoQkQsZ0NBZ0JDO0FBQUEsQ0FBQyJ9
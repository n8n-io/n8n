"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(number, index) {
    var inflectionIndex = 0;
    var isInflectionNeeded = index == 1 || index == 3 || index == 5 || index == 7 || index == 9 || index == 11 || index == 13;
    if (isInflectionNeeded && number >= 5) {
        inflectionIndex = 1;
    }
    return [
        [['právě teď', 'právě teď']],
        [['před %s vteřinami', 'za %s vteřiny'], ['před %s vteřinami', 'za %s vteřin']],
        [['před minutou', 'za minutu']],
        [['před %s minutami', 'za %s minuty'], ['před %s minutami', 'za %s minut']],
        [['před hodinou', 'za hodinu']],
        [['před %s hodinami', 'za %s hodiny'], ['před %s hodinami', 'za %s hodin']],
        [['včera', 'zítra']],
        [['před %s dny', 'za %s dny'], ['před %s dny', 'za %s dnů']],
        [['minulý týden', 'příští týden']],
        [['před %s týdny', 'za %s týdny'], ['před %s týdny', 'za %s týdnů']],
        [['minulý měsíc', 'přístí měsíc']],
        [['před %s měsíci', 'za %s měsíce'], ['před %s měsíci', 'za %s měsíců']],
        [['před rokem', 'přístí rok']],
        [['před %s lety', 'za %s roky'], ['před %s lety', 'za %s let']],
    ][index][inflectionIndex];
}
exports.default = default_1;
//# sourceMappingURL=cs.js.map
export default function (number, index) {
    var langTable = [
        ['chiar acum', 'chiar acum'],
        ['acum %s secunde', 'peste %s secunde'],
        ['acum un minut', 'peste un minut'],
        ['acum %s minute', 'peste %s minute'],
        ['acum o oră', 'peste o oră'],
        ['acum %s ore', 'peste %s ore'],
        ['acum o zi', 'peste o zi'],
        ['acum %s zile', 'peste %s zile'],
        ['acum o săptămână', 'peste o săptămână'],
        ['acum %s săptămâni', 'peste %s săptămâni'],
        ['acum o lună', 'peste o lună'],
        ['acum %s luni', 'peste %s luni'],
        ['acum un an', 'peste un an'],
        ['acum %s ani', 'peste %s ani'],
    ];
    if (number < 20) {
        return langTable[index];
    }
    // A `de` preposition must be added between the number and the adverb
    // if the number is greater than 20.
    return [langTable[index][0].replace('%s', '%s de'), langTable[index][1].replace('%s', '%s de')];
}
//# sourceMappingURL=ro.js.map
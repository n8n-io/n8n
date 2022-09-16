export const ALL_ITEMS = `
// Loop over input items and add a new field called 'myNewField' to the JSON of each one
for (item of $input.all()) {
  item.json.myNewField = 1;
}

// You can write logs to the browser console
console.log('Done!');

return $input.all();
`.trim();

export const EACH_ITEM = `
// Add a new field called 'myNewField' to the JSON of the item
$input.item.myNewField = 1;

// You can write logs to the browser console
console.log('Done!');

return $input.item;
`.trim();

export const ALL_ITEMS_PLACEHOLDER = `
# Loop over input items and add a new field
# called 'myNewField' to the JSON of each one
for item in _input.all():
  item.json.myNewField = 1;

return _input.all();
`.trim();

export const EACH_ITEM_PLACEHOLDER = `
# Add a new field called 'myNewField' to the
# JSON of the item
_input.item.json.myNewField = 1;

return _input.item;
`.trim();

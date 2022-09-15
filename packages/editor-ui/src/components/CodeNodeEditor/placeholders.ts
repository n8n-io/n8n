import outdent from 'outdent';

const EDITOR_TOTAL_ROWS = 20;

const ALL_ITEMS_COMPACT = outdent`
	// Loop over input items and add a new field called 'myNewField' to the JSON of each one
	for (item of $input.all()) {
	  item.json.myNewField = 1;
	}

	// You can write logs to the browser console
	console.log('Done!');

	return $input.all();
`;

const ALL_ITEMS = ALL_ITEMS_COMPACT + '\n'.repeat(EDITOR_TOTAL_ROWS - ALL_ITEMS_COMPACT.split('\n').length);

const EACH_ITEM_COMPACT = outdent`
	// Add a new field called 'myNewField' to the JSON of the item
	$input.item.myNewField = 1;

	// You can write logs to the browser console
	console.log('Done!');

	return $input.item;
`;

const EACH_ITEM = EACH_ITEM_COMPACT + '\n'.repeat(EDITOR_TOTAL_ROWS - EACH_ITEM_COMPACT.split('\n').length);

export const PLACEHOLDERS = {
	ALL_ITEMS,
	EACH_ITEM,
};

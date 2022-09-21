import { STICKY_NODE_TYPE } from "@/constants";

export const ALL_ITEMS_PLACEHOLDER = `
// Loop over input items and add a new field
// called 'myNewField' to the JSON of each one
for (const item of $input.all()) {
  item.json.myNewField = 1;
}

// You can write logs to the browser console
console.log('Done!');

return $input.all();
`.trim();

export const EACH_ITEM_PLACEHOLDER = `
// Add a new field called 'myNewField' to the JSON of the item
$input.item.myNewField = 1;

// You can write logs to the browser console
console.log('Done!');

return $input.item;
`.trim();

export const NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION = [STICKY_NODE_TYPE];

export const AUTOCOMPLETABLE_BUILT_IN_MODULES = [
	'console',			'constants',			'crypto',
	'dns',					'dns/promises',		'fs',
	'fs/promises',	'http',						'http2',
	'https',				'inspector',			'module',
	'os',						'path',						'process',
	'readline',			'url',						'util',
	'zlib',
];

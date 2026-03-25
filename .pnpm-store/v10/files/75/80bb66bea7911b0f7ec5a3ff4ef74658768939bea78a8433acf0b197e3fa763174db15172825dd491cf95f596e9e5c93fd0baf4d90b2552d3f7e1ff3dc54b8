import fs from 'fs';
import path from 'path';

import C from '@unicode/unicode-15.0.0/Case_Folding/C/symbols.js';
import S from '@unicode/unicode-15.0.0/Case_Folding/S/symbols.js';

function normalize(map) {
	return Object.fromEntries(Array.from(map, ([o, i]) => [i, [].concat(o)[0]]));
}

const cases = {
	C: normalize(C),
	S: normalize(S),
};

fs.writeFileSync(
	path.join(process.cwd(), './helpers/caseFolding.json'),
	JSON.stringify(cases, null, '\t'),
);

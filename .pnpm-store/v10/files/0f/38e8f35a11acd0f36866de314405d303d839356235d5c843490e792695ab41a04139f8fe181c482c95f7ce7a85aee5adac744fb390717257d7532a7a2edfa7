import { SingleBuffer, configureSingle } from '../../dist/index.js';
import { copySync, data } from '../setup.js';

await configureSingle({
	backend: SingleBuffer,
	buffer: new ArrayBuffer(0x100000),
});

copySync(data);

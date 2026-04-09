import { bindContext } from '../../dist/context.js';
import { fs as _fs } from '../../dist/index.js';
import { copySync, data } from '../setup.js';

_fs.mkdirSync('/new_root');

export const { fs } = bindContext('/new_root');

copySync(data, fs);

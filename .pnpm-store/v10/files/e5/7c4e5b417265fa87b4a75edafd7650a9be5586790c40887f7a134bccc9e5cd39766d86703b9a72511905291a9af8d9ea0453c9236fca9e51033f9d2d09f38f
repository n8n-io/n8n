import PersistentFile from './PersistentFile.js';
import VolatileFile from './VolatileFile.js';
import Formidable, { DEFAULT_OPTIONS } from './Formidable.js';



// make it available without requiring the `new` keyword
// if you want it access `const formidable.IncomingForm` as v1
const formidable = (...args) => new Formidable(...args);
const {enabledPlugins} = DEFAULT_OPTIONS;

export default formidable;
export {
  PersistentFile as File,
  PersistentFile,
  VolatileFile,
  Formidable,
  // alias
  Formidable as IncomingForm,

  // as named
  formidable,


  // misc
  DEFAULT_OPTIONS as defaultOptions,
  enabledPlugins,  
};

export * from './parsers/index.js';
export * from './plugins/index.js';
export * as errors from './FormidableError.js';
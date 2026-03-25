import { KeyObject } from 'crypto';
import * as util from 'util';
export default util.types.isKeyObject
    ? (obj) => util.types.isKeyObject(obj)
    : (obj) => obj != null && obj instanceof KeyObject;

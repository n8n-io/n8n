
/**
 * Created by kor on 06/05/15.
 */

export {load, loadAll, safeLoad, safeLoadAll, LoadOptions} from './loader';
export {dump, safeDump} from './dumper';

import Mark=require("./mark")
export import YAMLException = require('./exception');

export * from './yamlAST'

export type Error = YAMLException

function deprecated(name) {
    return function () {
        throw new Error('Function ' + name + ' is deprecated and cannot be used.');
    };
}

export * from './scalarInference'

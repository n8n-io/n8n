/**
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { Enum } from '../../Enum';

/**
 * @private
 */
export class SettingsParser extends Enum {

    print(/*context, buf*/) {
        return true;  // nothing to do here
    }

    parse(context, text, position) {
        // using ordinals to avoid javac synthetic inner class
        switch (this) {
            case SettingsParser.SENSITIVE:   context.setCaseSensitive(true); break;
            case SettingsParser.INSENSITIVE: context.setCaseSensitive(false); break;
            case SettingsParser.STRICT:      context.setStrict(true); break;
            case SettingsParser.LENIENT:     context.setStrict(false); break;
        }
        return position;
    }

    toString() {
        // using ordinals to avoid javac synthetic inner class
        switch (this) {
            case SettingsParser.SENSITIVE:   return 'ParseCaseSensitive(true)';
            case SettingsParser.INSENSITIVE: return 'ParseCaseSensitive(false)';
            case SettingsParser.STRICT:      return 'ParseStrict(true)';
            case SettingsParser.LENIENT:     return 'ParseStrict(false)';
        }
    }
}

SettingsParser.SENSITIVE = new SettingsParser('SENSITIVE');
SettingsParser.INSENSITIVE = new SettingsParser('INSENSITIVE');
SettingsParser.STRICT = new SettingsParser('STRICT');
SettingsParser.LENIENT = new SettingsParser('LENIENT');


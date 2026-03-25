import { type OutputConfiguration } from 'commander';
import * as editorconfig from './';
/**
 * Command line interface for editorconfig.  Pulled out into a separate module
 * to make it easier to test.
 *
 * @param args Usually process.argv.  Note that the first two parameters are
 * usually 'node' and 'editorconfig'
 * @param testing If testing, you may pass in a Commander OutputConfiguration
 * so that you can capture stdout and stderror.  If `testing` is provided,
 * this routine will throw an error instead of calling `process.exit`.
 * @returns An array of combined properties, one for each file argument.
 */
export default function cli(args: string[], testing?: OutputConfiguration): Promise<editorconfig.Props[]>;

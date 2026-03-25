import { EmptyTask } from './task';
import { OptionFlags, Options, StringTask } from '../types';
export type CloneOptions = Options & OptionFlags<'--bare' | '--dissociate' | '--mirror' | '--no-checkout' | '--no-remote-submodules' | '--no-shallow-submodules' | '--no-single-branch' | '--no-tags' | '--remote-submodules' | '--single-branch' | '--shallow-submodules' | '--verbose'> & OptionFlags<'--depth' | '-j' | '--jobs', number> & OptionFlags<'--branch' | '--origin' | '--recurse-submodules' | '--separate-git-dir' | '--shallow-exclude' | '--shallow-since' | '--template', string>;
export declare function cloneTask(repo: string | undefined, directory: string | undefined, customArgs: string[]): StringTask<string> | EmptyTask;
export declare function cloneMirrorTask(repo: string | undefined, directory: string | undefined, customArgs: string[]): EmptyTask | StringTask<string>;

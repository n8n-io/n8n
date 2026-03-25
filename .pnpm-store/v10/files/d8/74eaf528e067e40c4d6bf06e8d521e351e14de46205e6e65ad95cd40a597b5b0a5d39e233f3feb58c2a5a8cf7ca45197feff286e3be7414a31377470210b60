/**
 * MIT License
 *
 * Copyright (c) 2020 Engineering at FullStory
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */
/**
 * The following code is based on the FullStory Babel plugin, but has been modified to work
 * with Sentry products:
 *
 * - Added `sentry` to data properties, i.e `data-sentry-component`
 * - Converted to TypeScript
 * - Code cleanups
 */
import type * as Babel from "@babel/core";
import type { PluginObj, PluginPass } from "@babel/core";
interface AnnotationOpts {
    native?: boolean;
    "annotate-fragments"?: boolean;
    ignoredComponents?: string[];
}
interface FragmentContext {
    fragmentAliases: Set<string>;
    reactNamespaceAliases: Set<string>;
}
interface AnnotationPluginPass extends PluginPass {
    opts: AnnotationOpts;
    sentryFragmentContext?: FragmentContext;
}
type AnnotationPlugin = PluginObj<AnnotationPluginPass>;
export default function componentNameAnnotatePlugin({ types: t }: typeof Babel): AnnotationPlugin;
export {};

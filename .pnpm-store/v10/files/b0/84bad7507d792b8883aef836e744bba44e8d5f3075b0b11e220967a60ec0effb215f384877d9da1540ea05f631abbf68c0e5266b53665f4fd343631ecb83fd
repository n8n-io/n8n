// Type definitions for Juice 3.0.0
// Project: https://github.com/Automattic/juice
// Definitions by: Kamil Nikel <https://github.com/knikel>

/* =================== USAGE ===================
   import juice = require('juice');
   =============================================== */

export = juice;

declare function juice(html: string, options?: juice.Options): string;

declare namespace juice {

  export function juiceResources(html: string, options: Options, callback: Callback): string

  export function juiceFile(filePath: string, options: Options, callback: Callback): string

  export function juiceDocument($: any, options?: Options): any

  export function inlineContent(html: string, css: string, options?: Options): string

  export function inlineDocument($: any, css: string, options?: Options): any

  export let codeBlocks: { [index: string]: { start: string, end: string } };
  export let excludedProperties: string[];
  export let heightElements: HTMLElement[];
  export let ignoredPseudos: string[];
  export let nonVisualElements: HTMLElement[];
  export let styleToAttribute: { [index: string]: string };
  export let tableElements: HTMLElement[];
  export let widthElements: HTMLElement[];

  export interface Callback { (err: Error, html: string): any; }

  interface Options {
    extraCss?: string;
    applyStyleTags?: boolean;
    removeStyleTags?: boolean;
    preserveMediaQueries?: boolean;
    preserveFontFaces?: boolean;
    preserveKeyFrames?: boolean;
    preservePseudos?: boolean;
    insertPreservedExtraCss?: boolean;
    applyWidthAttributes?: boolean;
    applyHeightAttributes?: boolean;
    applyAttributesTableElements?: boolean;
    webResources?: WebResourcesOptions;
    inlinePseudoElements?: boolean;
    xmlMode?: boolean;
    preserveImportant?: boolean;
    resolveCSSVariables?: boolean;
  }

  interface WebResourcesOptions {
    fileContent?: string;
    inlineAttribute?: string;
    images?: boolean | number;
    svgs?: boolean | number;
    scripts?: boolean | number;
    links?: boolean | number;
    relativeTo?: string;
    rebaseRelativeTo?: string;
    strict?: boolean;
  }
}

// Type definitions for yamljs 0.2.3
// Project: https://github.com/jeremyfa/yaml.js
// Definitions by: Tim Jonischkat <http://www.tim-jonischkat.de>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

export as namespace YAML;
export = YAML;

declare namespace YAML {
    function load(path: string): any;

    function load(path: string, callback: (res:any) => void): void
    
    function stringify(nativeObject: any, inline?: number, spaces?: number): string;

    function parse(yamlString: string): any;
}

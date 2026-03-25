import Chain = require("stream-chain");
import FilterBase = require("./FilterBase");

export = Ignore;

declare class Ignore extends FilterBase {
    constructor(options: FilterBase.FilterOptions);
}

declare namespace Ignore {
    function make(options: FilterBase.FilterOptions): Ignore;

    namespace make {
        type Constructor = Ignore;
        const Constructor: typeof Ignore;
    }

    function ignore(options: FilterBase.FilterOptions): Ignore;

    namespace ignore {
        type Constructor = Ignore;
        const Constructor: typeof Ignore;
    }

    function withParser(options: FilterBase.FilterOptions): Chain;
}

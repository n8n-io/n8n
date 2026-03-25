import Ruler = require("./ruler");
import StateCore = require("./rules_core/state_core");

declare namespace Core {
    type RuleCore = (state: StateCore) => void;
}

declare class Core {
    ruler: Ruler<Core.RuleCore>;

    /**
     * Executes core chain rules.
     */
    process(state: StateCore): void;

    State: typeof StateCore;
}

export = Core;

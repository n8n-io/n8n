export class TargetGuards {
    static isSingleTargetRef(target) {
        if (!target)
            return false;
        return target.type_ === 'single';
    }
    static isMultiTargetRef(target) {
        if (!target)
            return false;
        return target.type_ === 'multi';
    }
    static isCountRef(target) {
        if (!target)
            return false;
        return target.type_ === 'count';
    }
    static isProperty(target) {
        if (!target)
            return false;
        return typeof target === 'string';
    }
    static isTargetRef(target) {
        if (!target)
            return false;
        return TargetGuards.isSingleTargetRef(target) || TargetGuards.isMultiTargetRef(target);
    }
}

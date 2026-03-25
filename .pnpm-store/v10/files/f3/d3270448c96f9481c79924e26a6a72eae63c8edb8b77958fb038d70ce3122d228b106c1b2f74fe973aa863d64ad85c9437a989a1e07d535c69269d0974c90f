import type { Excerpt, IExcerptTokenRange } from '../mixins/Excerpt';
import { type IApiDeclaredItemOptions, ApiDeclaredItem, type IApiDeclaredItemJson } from './ApiDeclaredItem';
import { ApiReleaseTagMixin, type IApiReleaseTagMixinOptions } from '../mixins/ApiReleaseTagMixin';
import { type IApiNameMixinOptions, ApiNameMixin } from '../mixins/ApiNameMixin';
import type { DeserializerContext } from '../model/DeserializerContext';
import { ApiOptionalMixin, type IApiOptionalMixinOptions } from '../mixins/ApiOptionalMixin';
import { ApiReadonlyMixin, type IApiReadonlyMixinOptions } from '../mixins/ApiReadonlyMixin';
/**
 * Constructor options for {@link ApiPropertyItem}.
 * @public
 */
export interface IApiPropertyItemOptions extends IApiNameMixinOptions, IApiReleaseTagMixinOptions, IApiOptionalMixinOptions, IApiReadonlyMixinOptions, IApiDeclaredItemOptions {
    propertyTypeTokenRange: IExcerptTokenRange;
}
export interface IApiPropertyItemJson extends IApiDeclaredItemJson {
    propertyTypeTokenRange: IExcerptTokenRange;
}
declare const ApiPropertyItem_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiReadonlyMixin) & (new (...args: any[]) => ApiOptionalMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiNameMixin);
/**
 * The abstract base class for {@link ApiProperty} and {@link ApiPropertySignature}.
 *
 * @public
 */
export declare class ApiPropertyItem extends ApiPropertyItem_base {
    /**
     * An {@link Excerpt} that describes the type of the property.
     */
    readonly propertyTypeExcerpt: Excerpt;
    constructor(options: IApiPropertyItemOptions);
    /** @override */
    static onDeserializeInto(options: Partial<IApiPropertyItemOptions>, context: DeserializerContext, jsonObject: IApiPropertyItemJson): void;
    /**
     * Returns true if this property should be documented as an event.
     *
     * @remarks
     * The `@eventProperty` TSDoc modifier can be added to readonly properties to indicate that they return an
     * event object that event handlers can be attached to.  The event-handling API is implementation-defined, but
     * typically the return type would be a class with members such as `addHandler()` and `removeHandler()`.
     * The documentation should display such properties under an "Events" heading instead of the
     * usual "Properties" heading.
     */
    get isEventProperty(): boolean;
    /** @override */
    serializeInto(jsonObject: Partial<IApiPropertyItemJson>): void;
}
export {};
//# sourceMappingURL=ApiPropertyItem.d.ts.map
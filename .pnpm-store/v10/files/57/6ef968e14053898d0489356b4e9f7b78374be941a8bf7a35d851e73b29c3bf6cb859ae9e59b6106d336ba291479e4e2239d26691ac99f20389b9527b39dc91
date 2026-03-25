export type DrawLayerBuilderOptions = {
    pageIndex: number;
};
export type DrawLayerBuilderRenderOptions = {
    /**
     * - The default value is "display".
     */
    intent?: string | undefined;
};
/**
 * @typedef {Object} DrawLayerBuilderOptions
 * @property {number} pageIndex
 */
/**
 * @typedef {Object} DrawLayerBuilderRenderOptions
 * @property {string} [intent] - The default value is "display".
 */
export class DrawLayerBuilder {
    /**
     * @param {DrawLayerBuilderOptions} options
     */
    constructor(options: DrawLayerBuilderOptions);
    pageIndex: number;
    /**
     * @param {DrawLayerBuilderRenderOptions} options
     * @returns {Promise<void>}
     */
    render({ intent }: DrawLayerBuilderRenderOptions): Promise<void>;
    cancel(): void;
    _cancelled: boolean | undefined;
    setParent(parent: any): void;
    getDrawLayer(): null;
    #private;
}

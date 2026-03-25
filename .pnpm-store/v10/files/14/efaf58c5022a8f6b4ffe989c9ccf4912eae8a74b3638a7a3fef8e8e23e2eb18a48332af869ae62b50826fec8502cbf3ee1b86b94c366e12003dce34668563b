import { FullItem, FullItemAllOfFields, GeneratorRecipe, ItemUrls } from "../model/models";
export interface ItemFieldOptions {
    value?: string;
    type?: FullItemAllOfFields.TypeEnum;
    sectionName?: string;
    purpose?: FullItemAllOfFields.PurposeEnum;
    label?: string;
    generate?: boolean;
    recipe?: GeneratorRecipe;
}
export declare class ItemBuilder {
    /**
     * Empty Item under construction.
     *
     * @private
     */
    private item;
    /**
     * Hashmap to support get-or-create operations on "sections" when adding fields
     *
     * @private
     */
    private sections;
    private urls;
    constructor();
    /**
     * Performs final assembly of the new Item.
     */
    build(): FullItem;
    /**
     * Clears accumulated properties and puts
     * ItemBuilder back to a "pristine" state
     */
    reset(): void;
    /**
     * @deprecated
     * Sets the parent Vault ID for the Item being constructed.
     *
     * @param {string} vaultId
     * @returns {ItemBuilder}
     */
    setVault(vaultId: string): ItemBuilder;
    /**
     * Set Title for the item under construction
     *
     * @param {string} title
     * @returns {ItemBuilder}
     */
    setTitle(title: string): ItemBuilder;
    /**
     * Append new tag to list of tags
     * 1Password does not normalize tag inputs.
     *
     * @param {string} tag
     * @returns {ItemBuilder}
     */
    addTag(tag: string): ItemBuilder;
    /**
     * Append new Item Field to the in-flight Item.
     *
     * @param {ItemFieldOptions} opts
     * @returns {ItemBuilder}
     */
    addField(opts?: ItemFieldOptions): ItemBuilder;
    /**
     * Define a new section within the Item.
     *
     * If a section with the same (normalized) name
     * already exists, do nothing.
     *
     * @param sectionName
     * @returns {ItemBuilder}
     */
    addSection(sectionName: string): ItemBuilder;
    /**
     * Toggle `favorite` value on the in-flight Item.
     *
     * @returns {ItemBuilder}
     */
    toggleFavorite(): ItemBuilder;
    /**
     * Add a new URL to the Item.
     *
     * The **last** url marked `primary` will be the primary URL
     * when saved to 1Password.
     *
     * @param url
     * @returns {ItemBuilder}
     */
    addUrl(url: ItemUrls): ItemBuilder;
    /**
     * Assign category to the Item under construction.
     *
     * @param category
     * @returns {ItemBuilder}
     */
    setCategory(category: FullItem.CategoryEnum | string): ItemBuilder;
    /**
     * Creates a new Item Section if it does not exist. Otherwise, return the previously-created
     * Item Section.
     *
     * Normalizes sectionName as a slug (utf-8 chars are transformed to ascii).
     *
     * @param sectionName
     * @private
     * @return {FullItemAllOfSections}
     */
    private getOrCreateSection;
}

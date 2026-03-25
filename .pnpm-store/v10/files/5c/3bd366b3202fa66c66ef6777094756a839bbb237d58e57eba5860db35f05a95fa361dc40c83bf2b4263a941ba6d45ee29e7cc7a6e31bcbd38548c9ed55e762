"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemBuilder = void 0;
const debug_1 = __importDefault(require("debug"));
const lodash_clonedeep_1 = __importDefault(require("lodash.clonedeep"));
const slugify_1 = __importDefault(require("slugify"));
const models_1 = require("../model/models");
const utils_1 = require("./utils");
const debug = (0, debug_1.default)("opconnect:builder");
class ItemBuilder {
    constructor() {
        this.reset();
    }
    /**
     * Performs final assembly of the new Item.
     */
    build() {
        if (!this.item.category) {
            throw Error("Item Category is required.");
        }
        this.item.sections = Array.from(this.sections.values());
        this.item.urls = this.urls.hrefs.map((href) => this.urls.primaryUrl === href
            ? { primary: true, href }
            : { href });
        const builtItem = (0, lodash_clonedeep_1.default)(this.item);
        debug("Successfully built Item (id: %s, vault: %s)", builtItem.id);
        this.reset();
        return builtItem;
    }
    /**
     * Clears accumulated properties and puts
     * ItemBuilder back to a "pristine" state
     */
    reset() {
        this.item = new models_1.FullItem();
        this.item.fields = [];
        this.item.tags = [];
        this.sections = new Map();
        this.urls = { primaryUrl: "", hrefs: [] };
    }
    /**
     * @deprecated
     * Sets the parent Vault ID for the Item being constructed.
     *
     * @param {string} vaultId
     * @returns {ItemBuilder}
     */
    setVault(vaultId) {
        this.item.vault = { id: vaultId };
        return this;
    }
    /**
     * Set Title for the item under construction
     *
     * @param {string} title
     * @returns {ItemBuilder}
     */
    setTitle(title) {
        this.item.title = title;
        return this;
    }
    /**
     * Append new tag to list of tags
     * 1Password does not normalize tag inputs.
     *
     * @param {string} tag
     * @returns {ItemBuilder}
     */
    addTag(tag) {
        this.item.tags.push(tag);
        return this;
    }
    /**
     * Append new Item Field to the in-flight Item.
     *
     * @param {ItemFieldOptions} opts
     * @returns {ItemBuilder}
     */
    addField(opts = {}) {
        if (opts.generate && !validRecipe(opts.recipe)) {
            throw TypeError(`Field '${opts.label}' contains an invalid Recipe.`);
        }
        const field = {
            type: opts.type || models_1.FullItemAllOfFields.TypeEnum.String,
            purpose: opts.purpose || models_1.FullItemAllOfFields.PurposeEnum.Empty,
            label: opts.label,
            value: opts.value,
            generate: opts.generate || false,
            recipe: opts.generate && opts.recipe ? generatorRecipeFromConfig(opts.recipe) : undefined
        };
        if (opts.sectionName) {
            const { id: sectionId } = this.getOrCreateSection(opts.sectionName);
            field.section = { id: sectionId };
        }
        this.item.fields.push(field);
        return this;
    }
    /**
     * Define a new section within the Item.
     *
     * If a section with the same (normalized) name
     * already exists, do nothing.
     *
     * @param sectionName
     * @returns {ItemBuilder}
     */
    addSection(sectionName) {
        this.getOrCreateSection(sectionName);
        return this;
    }
    /**
     * Toggle `favorite` value on the in-flight Item.
     *
     * @returns {ItemBuilder}
     */
    toggleFavorite() {
        this.item.favorite = !this.item.favorite;
        return this;
    }
    /**
     * Add a new URL to the Item.
     *
     * The **last** url marked `primary` will be the primary URL
     * when saved to 1Password.
     *
     * @param url
     * @returns {ItemBuilder}
     */
    addUrl(url) {
        if (url.primary)
            this.urls.primaryUrl = url.href;
        this.urls.hrefs.push(url.href);
        return this;
    }
    /**
     * Assign category to the Item under construction.
     *
     * @param category
     * @returns {ItemBuilder}
     */
    setCategory(category) {
        if (Object.values(models_1.FullItem.CategoryEnum).indexOf(category) === -1) {
            throw TypeError("Item Category is invalid");
        }
        this.item.category = category;
        return this;
    }
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
    getOrCreateSection(sectionName) {
        const normalizedName = (0, slugify_1.default)(sectionName, { lower: true, remove: /[*+~.()'"!:@]/g });
        if (this.sections.has(normalizedName)) {
            return this.sections.get(normalizedName);
        }
        // Note about Section IDs: these do NOT have to be cryptographically random.
        // Section IDs are only unique within an Item.
        const section = {
            id: (0, utils_1.generateSectionId)(),
            label: sectionName,
        };
        this.sections.set(normalizedName, section);
        return section;
    }
}
exports.ItemBuilder = ItemBuilder;
/**
 * Creates a well-formed GeneratorRecipe from the provided options.
 * Namely, it removes duplicate values from the character set definitions.
 * @param {Partial<GeneratorRecipe>} opts
 * @return {GeneratorRecipe}
 */
const generatorRecipeFromConfig = (opts) => {
    // excluded character setting cannot contain duplicate entries
    const excludeCharacters = [...new Set(opts.excludeCharacters)].reduce((acc, curr) => acc + curr, "");
    return Object.assign(Object.assign({}, opts), { characterSets: [...new Set(opts.characterSets)], excludeCharacters });
};
/**
 * Evaluate Recipe parameters against allowed values.
 *
 * @param {GeneratorRecipe} recipe
 * @returns {boolean}
 */
const validRecipe = (recipe) => {
    if (!recipe.characterSets || !recipe.characterSets.length)
        return true;
    const allowedCharactersSets = Object.values(models_1.GeneratorRecipe.CharacterSetsEnum);
    // User provided more character sets than are defined
    if (recipe.characterSets.length > allowedCharactersSets.length)
        return false;
    for (const cs of recipe.characterSets) {
        if (allowedCharactersSets.indexOf(cs) === -1) {
            return false;
        }
    }
    return true;
};
//# sourceMappingURL=builders.js.map
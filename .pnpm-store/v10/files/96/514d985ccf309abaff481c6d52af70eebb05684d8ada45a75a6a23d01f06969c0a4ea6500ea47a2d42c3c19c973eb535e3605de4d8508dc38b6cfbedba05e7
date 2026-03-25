/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { TurnContext } from '../turnContext';
import { AgentState, CustomKey } from './agentState';
/**
 * Interface for accessing a property in state storage with type safety.
 *
 * @typeParam T The type of the property being accessed
 *
 * @remarks
 * This interface defines standard methods for working with persisted state properties,
 * allowing property access with strong typing to reduce errors when working with
 * complex state objects.
 *
 */
export interface StatePropertyAccessor<T = any> {
    /**
     * Deletes the persisted property from its backing storage object.
     *
     * @param context Context for the current turn of conversation with the user.
     *
     * @remarks
     * The properties backing storage object SHOULD be loaded into memory on first access.
     *
     * @example
     * ```javascript
     * await myProperty.delete(context);
     * ```
     *
     */
    delete(context: TurnContext): Promise<void>;
    /**
     * Reads a persisted property from its backing storage object.
     *
     * @param context Context for the current turn of conversation with the user.
     *
     * @remarks
     * The properties backing storage object SHOULD be loaded into memory on first access.
     *
     * If the property does not currently exist on the storage object and a `defaultValue` has been
     * specified, a clone of the `defaultValue` SHOULD be copied to the storage object. If a
     * `defaultValue` has not been specified then a value of `undefined` SHOULD be returned.
     *
     * @example
     * ```javascript
     * const value = await myProperty.get(context, { count: 0 });
     * ```
     *
     */
    get(context: TurnContext): Promise<T | undefined>;
    /**
     * Reads a persisted property from its backing storage object.
     *
     * @param context Context for the current turn of conversation with the user.
     * @param defaultValue (Optional) default value to copy to the backing storage object if the property isn't found.
     */
    get(context: TurnContext, defaultValue: T): Promise<T>;
    /**
     * Assigns a new value to the properties backing storage object.
     *
     * @param context Context for the current turn of conversation with the user.
     * @param value Value to assign.
     *
     * @remarks
     * The properties backing storage object SHOULD be loaded into memory on first access.
     *
     * Depending on the state systems implementation, an additional step may be required to
     * persist the actual changes to disk.
     *
     * @example
     * ```javascript
     * await myProperty.set(context, value);
     * ```
     *
     */
    set(context: TurnContext, value: T): Promise<void>;
}
/**
 * Provides typed access to an Agent state property with automatic state loading and persistence management.
 *
 * @typeParam T The type of the property being accessed. Can be any serializable type.
 *
 * @remarks
 * `AgentStatePropertyAccessor` simplifies working with persisted state by abstracting
 * the complexity of loading state from storage and manipulating specific properties.
 * It provides a type-safe interface for state management with automatic handling of:
 *
 * - **Lazy Loading**: State is loaded from storage only when first accessed
 * - **Type Safety**: Full TypeScript support with generic type parameters
 * - **Default Values**: Automatic deep cloning of default values to prevent reference issues
 * - **Memory Management**: Efficient in-memory caching with explicit persistence control
 * - **Custom Keys**: Support for custom storage keys for advanced scenarios
 *
 * ### Key Features
 *
 * Key features of `AgentStatePropertyAccessor` include:
 * - [Type Safety](#type-safety)
 * - [Automatic Default Value Handling](#automatic-default-value-handling)
 * - [Explicit Persistence Control](#explicit-persistence-control)
 *
 * #### Type Safety
 * The accessor provides compile-time type checking when using TypeScript:
 * ```typescript
 * interface UserProfile {
 *   name: string;
 *   preferences: { theme: string; language: string };
 * }
 * const userProfile = userState.createProperty<UserProfile>("userProfile");
 * ```
 *
 * #### Automatic Default Value Handling
 * When a property doesn't exist, default values are automatically cloned and stored:
 * ```typescript
 * // If userProfile doesn't exist, the default will be cloned and saved
 * const profile = await userProfile.get(context, {
 *   name: "Anonymous",
 *   preferences: { theme: "light", language: "en" }
 * });
 * ```
 *
 * #### Explicit Persistence Control
 * Changes are kept in memory until explicitly persisted:
 * ```typescript
 * // Modify the state
 * const counter = await counterProperty.get(context, 0);
 * await counterProperty.set(context, counter + 1);
 *
 * // Changes are only in memory at this point
 * // Persist to storage
 * await userState.saveChanges(context);
 * ```
 *
 * ### Usage Examples
 *
 * @example Basic Usage
 * ```typescript
 * // Create a property accessor
 * const userProfile = userState.createProperty<UserProfile>("userProfile");
 *
 * // Get with default value
 * const profile = await userProfile.get(context, {
 *   name: "",
 *   preferences: { theme: "light", language: "en" }
 * });
 *
 * // Modify the profile
 * profile.preferences.theme = "dark";
 *
 * // Save the changes
 * await userProfile.set(context, profile);
 * await userState.saveChanges(context); // Persist to storage
 * ```
 *
 * @example Working with Primitive Types
 * ```typescript
 * const counterProperty = userState.createProperty<number>("counter");
 *
 * // Increment counter
 * const currentCount = await counterProperty.get(context, 0);
 * await counterProperty.set(context, currentCount + 1);
 * await userState.saveChanges(context);
 * ```
 *
 * @example Conditional Logic
 * ```typescript
 * const settingsProperty = userState.createProperty<Settings>("settings");
 *
 * // Check if property exists
 * const settings = await settingsProperty.get(context);
 * if (settings === undefined) {
 *   // Property doesn't exist, initialize with defaults
 *   await settingsProperty.set(context, getDefaultSettings());
 * }
 * ```
 *
 * @example Custom Storage Keys
 * ```typescript
 * // Store state with a custom key for multi-tenant scenarios
 * const customKey = { key: `tenant_${tenantId}` };
 * const tenantData = await dataProperty.get(context, defaultData, customKey);
 * await dataProperty.set(context, updatedData, customKey);
 * ```
 *
 * ### Important Notes
 *
 * - **Thread Safety**: This class is not thread-safe. Ensure proper synchronization in concurrent scenarios.
 * - **Memory Usage**: State objects are kept in memory until the context is disposed.
 * - **Persistence**: Always call `state.saveChanges(context)` to persist changes to storage.
 * - **Deep Cloning**: Default values are deep cloned using JSON serialization, which may not work with complex objects containing functions or circular references.
 *
 * @see {@link AgentState.createProperty} for creating property accessors
 * @see {@link StatePropertyAccessor} for the interface definition
 */
export declare class AgentStatePropertyAccessor<T = any> implements StatePropertyAccessor<T> {
    protected readonly state: AgentState;
    readonly name: string;
    /**
     * Creates a new instance of AgentStatePropertyAccessor.
     *
     * @param state The agent state object that manages the backing storage for this property
     * @param name The unique name of the property within the state object. This name is used as the key in the state storage.
     *
     * @remarks
     * This constructor is typically not called directly. Instead, use {@link AgentState.createProperty}
     * to create property accessors, which ensures proper integration with the state management system.
     *
     * @example
     * ```typescript
     * // Recommended way - use AgentState.createProperty
     * const userProfile = userState.createProperty<UserProfile>("userProfile");
     *
     * // Direct construction (not recommended)
     * const accessor = new AgentStatePropertyAccessor<UserProfile>(userState, "userProfile");
     * ```
     *
     */
    constructor(state: AgentState, name: string);
    /**
     * Deletes the property from the state storage.
     *
     * @param context The turn context for the current conversation turn
     * @param customKey Optional custom key for accessing state in a specific storage location.
     * Useful for multi-tenant scenarios or when state needs to be partitioned.
     * @returns A promise that resolves when the delete operation is complete
     *
     * @remarks
     * This operation removes the property from the in-memory state object but does not
     * automatically persist the change to the underlying storage. You must call
     * `state.saveChanges(context)` afterwards to persist the deletion.
     *
     * - If the property doesn't exist, this operation is a no-op
     * - The deletion only affects the in-memory state until `saveChanges()` is called
     * - After deletion, subsequent `get()` calls will return `undefined` (or the default value if provided)
     *
     * @example Basic usage
     * ```typescript
     * const userSettings = userState.createProperty<UserSettings>("settings");
     *
     * // Delete the user settings
     * await userSettings.delete(context);
     *
     * // Persist the deletion to storage
     * await userState.saveChanges(context);
     *
     * // Verify deletion
     * const settings = await userSettings.get(context); // Returns undefined
     * ```
     *
     * @example Custom key usage
     * ```typescript
     * const tenantKey = { key: `tenant_${tenantId}` };
     * await userSettings.delete(context, tenantKey);
     * await userState.saveChanges(context);
     * ```
     *
     */
    delete(context: TurnContext, customKey?: CustomKey): Promise<void>;
    /**
     * Retrieves the value of the property from state storage.
     *
     * @param context The turn context for the current conversation turn
     * @param defaultValue Optional default value to use if the property doesn't exist.
     *                    When provided, this value is deep cloned and stored in state.
     * @param customKey Optional custom key for accessing state in a specific storage location.
     *                  Useful for multi-tenant scenarios or when state needs to be partitioned.
     *
     * @returns A promise that resolves to the property value, the cloned default value, or `undefined`
     *
     * @remarks
     * This method provides intelligent default value handling:
     * - If the property exists, its value is returned
     * - If the property doesn't exist and a default value is provided, the default is deep cloned,
     *   stored in state, and returned
     * - If the property doesn't exist and no default is provided, `undefined` is returned
     *
     * **Deep Cloning**: Default values are deep cloned using JSON serialization to prevent
     * reference sharing issues. This means:
     * - Functions, symbols, and circular references will be lost
     * - Dates become strings (use Date constructor to restore)
     * - Complex objects with prototypes lose their prototype chain
     *
     * **Performance**: The first access loads state from storage; subsequent accesses use
     * the in-memory cached version until the context is disposed.
     *
     * @example Basic usage
     * ```typescript
     * const counterProperty = userState.createProperty<number>("counter");
     *
     * // Get with default value
     * const count = await counterProperty.get(context, 0);
     * console.log(count); // 0 if property doesn't exist, otherwise the stored value
     * ```
     *
     * @example Complex object with default
     * ```typescript
     * interface UserProfile {
     *   name: string;
     *   preferences: { theme: string; notifications: boolean };
     * }
     *
     * const userProfile = userState.createProperty<UserProfile>("profile");
     * const profile = await userProfile.get(context, {
     *   name: "Anonymous",
     *   preferences: { theme: "light", notifications: true }
     * });
     * ```
     *
     * @example Checking for existence
     * ```typescript
     * const profile = await userProfile.get(context);
     * if (profile === undefined) {
     *   console.log("Profile has not been set yet");
     * } else {
     *   console.log(`Welcome back, ${profile.name}!`);
     * }
     * ```
     *
     * @example Custom key usage
     * ```typescript
     * const tenantKey = { key: `tenant_${tenantId}` };
     * const tenantData = await dataProperty.get(context, defaultData, tenantKey);
     * ```
     *
     */
    get(context: TurnContext, defaultValue?: T, customKey?: CustomKey): Promise<T>;
    /**
     * Sets the value of the property in state storage.
     *
     * @param context The turn context for the current conversation turn
     * @param value The value to assign to the property. Can be any serializable value.
     * @param customKey Optional custom key for accessing state in a specific storage location.
     *                  Useful for multi-tenant scenarios or when state needs to be partitioned.
     *
     * @returns A promise that resolves when the set operation is complete
     *
     * @remarks
     * This operation updates the property in the in-memory state object but does not
     * automatically persist the change to the underlying storage. You must call
     * `state.saveChanges(context)` afterwards to persist the changes.
     *
     * **Memory vs Storage**: Changes are immediately reflected in memory and will be
     * available to subsequent `get()` calls within the same context, but are not
     * persisted to storage until `saveChanges()` is called.
     *
     * **Value References**: The exact value reference is stored (no cloning occurs).
     * Ensure you don't modify objects after setting them unless you intend for those
     * changes to be reflected in state.
     *
     * **Type Safety**: When using TypeScript, the value must match the property's
     * declared type parameter.
     *
     * @example Basic usage
     * ```typescript
     * const counterProperty = userState.createProperty<number>("counter");
     *
     * // Set a new value
     * await counterProperty.set(context, 42);
     *
     * // Persist to storage
     * await userState.saveChanges(context);
     * ```
     *
     * @example Complex object
     * ```typescript
     * const userProfile = userState.createProperty<UserProfile>("profile");
     *
     * const newProfile: UserProfile = {
     *   name: "John Doe",
     *   preferences: { theme: "dark", notifications: false }
     * };
     *
     * await userProfile.set(context, newProfile);
     * await userState.saveChanges(context);
     * ```
     *
     * @example Incremental updates
     * ```typescript
     * // Get current value, modify, then set
     * const settings = await settingsProperty.get(context, getDefaultSettings());
     * settings.theme = "dark";
     * settings.lastUpdated = new Date();
     *
     * await settingsProperty.set(context, settings);
     * await userState.saveChanges(context);
     * ```
     *
     * @example Custom key usage
     * ```typescript
     * const tenantKey = { key: `tenant_${tenantId}` };
     * await dataProperty.set(context, updatedData, tenantKey);
     * await userState.saveChanges(context);
     * ```
     *
     */
    set(context: TurnContext, value: T, customKey?: CustomKey): Promise<void>;
}

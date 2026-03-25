/**
 * Used to inject transaction's repository into the method wrapped with @Transaction decorator.
 */
export interface TransactionRepositoryMetadataArgs {
    /**
     * Target class on which decorator is used.
     */
    readonly target: Function;
    /**
     * Method on which decorator is used.
     */
    readonly methodName: string;
    /**
     * Index of the parameter on which decorator is used.
     */
    readonly index: number;
    /**
     * Type of the repository class (Repository, TreeRepository or MongoRepository) or custom repository class.
     */
    readonly repositoryType: Function;
    /**
     * Argument of generic Repository<T> class if it's not custom repository class.
     */
    readonly entityType?: Function;
}

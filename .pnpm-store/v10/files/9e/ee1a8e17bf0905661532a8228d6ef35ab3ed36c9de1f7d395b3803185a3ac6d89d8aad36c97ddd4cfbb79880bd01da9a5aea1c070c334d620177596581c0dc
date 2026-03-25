import { ClassConstructor } from '..';
/**
 * Discriminator object containing the type information to select a proper type
 * during transformation when a discriminator property is provided.
 */
export interface DiscriminatorDescriptor {
    /**
     * The name of the property which holds the type information in the received object.
     */
    property: string;
    /**
     * List of the available types. The transformer will try to lookup the object
     * with the same key as the value received in the defined discriminator property
     * and create an instance of the defined class.
     */
    subTypes: {
        /**
         * Name of the type.
         */
        name: string;
        /**
         * A class constructor which can be used to create the object.
         */
        value: ClassConstructor<any>;
    }[];
}

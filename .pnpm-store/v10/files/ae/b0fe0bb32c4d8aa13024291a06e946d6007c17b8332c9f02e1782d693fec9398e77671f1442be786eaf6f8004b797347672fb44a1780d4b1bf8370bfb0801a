interface JSONPointer {
    /**
     * Looks up a JSON pointer in an object
     */
    get(object: Object): any;


    /**
     * Set a value for a JSON pointer on object
     */
    set(object: Object, value: any): void;
}


declare namespace JSONPointer {
    /**
     * Looks up a JSON pointer in an object
     */
    function get(object: Object, pointer: string): any;


    /**
     * Set a value for a JSON pointer on object
     */
    function set(object: Object, pointer: string, value: any): void;


    /**
     *  Builds a JSONPointer instance from a pointer value.
     */
    function compile(pointer: string): JSONPointer;
}


export = JSONPointer;

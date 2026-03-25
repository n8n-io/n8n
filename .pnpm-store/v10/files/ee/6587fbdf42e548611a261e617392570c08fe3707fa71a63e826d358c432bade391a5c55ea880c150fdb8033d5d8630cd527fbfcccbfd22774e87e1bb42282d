import { ModuleBase } from '../../internal/module-base';
/**
 * The possible definitions related to elements.
 */
export interface ChemicalElement {
    /**
     * The symbol for the element (e.g. `'He'`).
     */
    symbol: string;
    /**
     * The name for the element (e.g. `'Cerium'`).
     */
    name: string;
    /**
     * The atomic number for the element (e.g. `52`).
     */
    atomicNumber: number;
}
export interface Unit {
    /**
     * The long version of the unit (e.g. `meter`).
     */
    name: string;
    /**
     * The short version/abbreviation of the element (e.g. `Pa`).
     */
    symbol: string;
}
/**
 * Module to generate science related entries.
 *
 * ### Overview
 *
 * Both methods in this module return objects rather than strings. For example, you can use `faker.science.chemicalElement().name` to pick out the specific property you need.
 */
export declare class ScienceModule extends ModuleBase {
    /**
     * Returns a random periodic table element.
     *
     * @example
     * faker.science.chemicalElement() // { symbol: 'H', name: 'Hydrogen', atomicNumber: 1 }
     * faker.science.chemicalElement() // { symbol: 'Xe', name: 'Xenon', atomicNumber: 54 }
     * faker.science.chemicalElement() // { symbol: 'Ce', name: 'Cerium', atomicNumber: 58 }
     *
     * @since 7.2.0
     */
    chemicalElement(): ChemicalElement;
    /**
     * Returns a random scientific unit.
     *
     * @example
     * faker.science.unit() // { name: 'meter', symbol: 'm' }
     * faker.science.unit() // { name: 'second', symbol: 's' }
     * faker.science.unit() // { name: 'mole', symbol: 'mol' }
     *
     * @since 7.2.0
     */
    unit(): Unit;
}

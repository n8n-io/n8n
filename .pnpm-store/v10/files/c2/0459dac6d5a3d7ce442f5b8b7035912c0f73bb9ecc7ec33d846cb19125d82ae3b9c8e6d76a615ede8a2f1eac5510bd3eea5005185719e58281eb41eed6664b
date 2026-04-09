import type { BeanCollection } from '../../context/context';
import type { EditPosition, EditSource } from '../../interfaces/iEditService';
/** File is used to contain logic about whether a strategy is required.
 * This enables us to perform editing related checks without the overhead of creating the strategies and their event listeners.
 */
export declare function shouldStartEditing(beans: BeanCollection, { column }: Required<EditPosition>, event?: KeyboardEvent | MouseEvent | null, cellStartedEdit?: boolean | null, source?: EditSource): boolean;
export declare function isCellEditable(beans: BeanCollection, { rowNode, column }: Required<EditPosition>, _source?: 'api' | 'ui'): boolean;
export declare function isFullRowCellEditable(beans: BeanCollection, position: Required<EditPosition>, source?: 'api' | 'ui'): boolean;

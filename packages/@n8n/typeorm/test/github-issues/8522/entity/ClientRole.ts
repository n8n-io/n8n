import { ChildEntity } from '../../../../src';
import { Role } from './Role';

@ChildEntity('internal')
export class ClientRole extends Role {}

import { ChildEntity } from '../../../../src';
import { User } from './User';

@ChildEntity('internal')
export class InternalUser extends User {}

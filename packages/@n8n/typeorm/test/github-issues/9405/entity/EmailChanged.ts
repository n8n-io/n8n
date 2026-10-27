import { ChildEntity } from '../../../../src/index';
import { ChangeLog } from './ChangeLog';

export class Email {}

@ChildEntity()
export class EmailChanged extends ChangeLog<Email> {}

import { ChildEntity } from '@n8n/typeorm';

import { User } from './user';

/** The account of a person. Lives in the `user` table with `kind = 'person'`. */
@ChildEntity('person')
export class Person extends User {}

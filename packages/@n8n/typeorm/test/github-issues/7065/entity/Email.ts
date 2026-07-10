import { ChildEntity, ManyToOne } from '../../../../src';
import { Contact } from './Contact';
import { User } from './User';

@ChildEntity('email')
export class Email extends Contact {
	@ManyToOne(
		() => User,
		(user) => user.emails,
	)
	user: User;
}

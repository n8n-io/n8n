import { Entity } from '../../../../src/decorator/entity/Entity';
import { TableInheritance } from '../../../../src/decorator/entity/TableInheritance';
import { Token } from './Token';
import { OneToOne, JoinColumn } from '../../../../src/index';
import { Account } from './Account';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class AccountActivationToken extends Token {
	@OneToOne((type) => Account, 'accountActivationToken', {
		cascade: ['insert', 'update'],
	})
	@JoinColumn()
	account: Account;

	constructor(
		public tokenSecret: string,
		public expiresOn: Date,
	) {
		super();
	}
}

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable import/no-cycle */
import { IsDate, IsOptional, IsString } from 'class-validator';
import {
	BeforeUpdate,
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	RelationId,
	UpdateDateColumn,
} from 'typeorm';

import * as config from '../../../config';
import { DatabaseType } from '../../index';
import { User } from './User';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function getTimestampSyntax() {
	const dbType = config.getEnv('database.type');

	const map: { [key in DatabaseType]: string } = {
		sqlite: "STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')",
		postgresdb: 'CURRENT_TIMESTAMP(3)',
		mysqldb: 'CURRENT_TIMESTAMP(3)',
		mariadb: 'CURRENT_TIMESTAMP(3)',
	};

	return map[dbType];
}

@Entity()
export class FederatedUser {
	@ManyToOne(() => User, (user) => user.federatedUsers, { primary: true, onDelete: 'CASCADE' })
	user: User;

	@RelationId((federatedUser: FederatedUser) => federatedUser.user)
	userId: string;

	@Column()
	@IsString({ message: 'Identifier must be of type string.' })
	identifier: string;

	@Column({ primary: true })
	@IsString({ message: 'Issuer must be of type string.' })
	issuer: string;

	@CreateDateColumn({ precision: 3, default: () => getTimestampSyntax() })
	@IsOptional() // ignored by validation because set at DB level
	@IsDate()
	createdAt: Date;

	@UpdateDateColumn({
		precision: 3,
		default: () => getTimestampSyntax(),
		onUpdate: getTimestampSyntax(),
	})
	@IsOptional() // ignored by validation because set at DB level
	@IsDate()
	updatedAt: Date;

	@BeforeUpdate()
	setUpdateDate(): void {
		this.updatedAt = new Date();
	}
}

import { Column, Entity, Index, ManyToOne, PrimaryColumn, Unique } from '@n8n/typeorm';
import { User } from './User';
import { ByteColumnType, jsonColumnType } from './AbstractEntity';
import { objectRetriever } from '../utils/transformers';
// import { WithTimestamps } from './AbstractEntity';

@Entity()
@Unique(['id', 'userId'])
export class Passkeys {
	@PrimaryColumn('text')
	id: string;

	@Column(ByteColumnType)
	publicKey: Buffer;

	@ManyToOne(() => User, (user) => user.passkeys)
	user: User;

	@Index()
	@Column('text')
	userId: string;

	@Column('bigint')
	counter: number;

	@Column({
		type: 'varchar',
		length: 32,
	})
	deviceType: string;

	@Column('boolean')
	backedUp: boolean;

	@Column({
		type: jsonColumnType,
		nullable: true,
		transformer: objectRetriever,
	})
	transports: string[];
}

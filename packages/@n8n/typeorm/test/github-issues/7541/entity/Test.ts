import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

enum StandardSetType {
	AcademicStandard = 'AcademicStandard',
	FoundationalKnowledge = 'FoundationalKnowledge',
	AchievementDescriptor = 'AchievementDescriptor',
}

@Entity()
export class TestEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column('enum', { enum: StandardSetType, name: 'type' })
	type: StandardSetType;

	@Column({ type: 'enum', enum: StandardSetType })
	type2: StandardSetType;

	@Column('enum', { enum: StandardSetType, enumName: 'StandardSetType' })
	type3: StandardSetType;

	@Column({ type: 'enum', enumName: 'StandardSetType' })
	type4: StandardSetType;
}

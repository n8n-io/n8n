import { Entity, Column, PrimaryColumn } from '../../../../../src';

export enum NumericEnum {
	ADMIN,
	EDITOR,
	MODERATOR,
	GHOST,
}

export enum StringEnum {
	ADMIN = 'a',
	EDITOR = 'e',
	MODERATOR = 'm',
	GHOST = 'g',
}

export enum StringNumericEnum {
	ONE = '1',
	TWO = '2',
	THREE = '3',
	FOUR = '4',
}

export enum HeterogeneousEnum {
	NO = 0,
	YES = 'YES',
}

export type ArrayDefinedStringEnumType = 'admin' | 'editor' | 'ghost';

export type ArrayDefinedNumericEnumType = 11 | 12 | 13;

@Entity()
export class EnumArrayEntity {
	@PrimaryColumn()
	id: number;

	@Column({
		type: 'enum',
		enum: NumericEnum,
		array: true,
		default: [NumericEnum.GHOST, NumericEnum.ADMIN],
	})
	numericEnums: NumericEnum[];

	@Column({
		type: 'enum',
		enum: StringEnum,
		array: true,
		default: [],
	})
	stringEnums: StringEnum[];

	@Column({
		type: 'enum',
		enum: StringNumericEnum,
		array: true,
		default: [StringNumericEnum.THREE, StringNumericEnum.ONE],
	})
	stringNumericEnums: StringNumericEnum[];

	@Column({
		type: 'enum',
		enum: HeterogeneousEnum,
		array: true,
		default: [HeterogeneousEnum.YES],
	})
	heterogeneousEnums: HeterogeneousEnum[];

	@Column({
		type: 'enum',
		enum: ['admin', 'editor', 'ghost'],
		array: true,
		default: ['admin'],
	})
	arrayDefinedStringEnums: ArrayDefinedStringEnumType[];

	@Column({
		type: 'enum',
		enum: [11, 12, 13],
		array: true,
		default: [11, 13],
	})
	arrayDefinedNumericEnums: ArrayDefinedNumericEnumType[];

	@Column({
		type: 'enum',
		enum: StringEnum,
		array: true,
		nullable: true,
	})
	enumWithoutDefault: StringEnum[];

	@Column({
		type: 'enum',
		enum: StringEnum,
		array: true,
		default: '{a,e}',
	})
	defaultArrayAsString: StringEnum[];

	@Column({
		type: 'enum',
		enum: StringEnum,
		array: true,
		default: '{}',
	})
	legacyDefaultAsString: StringEnum[];
}

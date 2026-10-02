import { Entity } from '../../../../src';
import { Column } from '../../../../src';
import { PrimaryColumn } from '../../../../src';

@Entity()
export class User {
	@PrimaryColumn({
		type: 'int4',
		unique: true,
		name: 'id',
	})
	public id: number;

	@Column({
		type: 'citext',
		unique: true,
		name: 'nick_name',
	})
	public nickName: string;

	@Column({
		type: 'varchar',
		nullable: true,
		name: 'first_name',
	})
	public firstName: string;

	@Column({
		type: 'varchar',
		nullable: true,
		name: 'last_name',
	})
	public lastName: string;

	@Column({
		type: 'timestamptz',
		nullable: true,
		name: 'birthday',
	})
	public birthday: Date;

	@Column({
		type: 'timestamptz',
		default: 'now()',
		name: 'created_at',
	})
	public createdAt: Date;

	@Column({
		type: 'varchar',
		nullable: true,
		name: 'phone',
	})
	public phone: string;

	@Column({
		type: 'varchar',
		nullable: true,
		name: 'email',
	})
	public email: string;

	@Column({
		type: 'bool',
		default: 'false',
		name: 'phone_confirmed',
	})
	public phoneConfirmed: boolean;

	@Column({
		type: 'bool',
		default: 'false',
		name: 'email_confirmed',
	})
	public emailConfirmed: boolean;

	@Column({
		type: 'timestamptz',
		default: 'now()',
		name: 'last_activity',
	})
	public lastActivity: Date;

	@Column({
		type: 'varchar',
		nullable: true,
		name: 'link',
	})
	public link: string;

	@Column({
		type: 'varchar',
		nullable: true,
		name: 'avatar',
	})
	public avatar: string;

	@Column({
		type: 'int4',
		nullable: true,
		name: 'city_id',
	})
	public cityID: number;

	@Column({
		type: 'varchar',
		nullable: true,
		name: 'avatar_url',
	})
	public avatarUrl: string;

	@Column({
		type: 'int2',
		default: '0',
		name: 'friends_count',
	})
	public friendsCount: number;

	@Column({
		type: 'int4',
		default: '0',
		name: 'unread_notifications_count',
	})
	public unreadNotificationsCount: number;

	@Column({
		type: 'bool',
		default: 'false',
		name: 'verified',
	})
	public verified: boolean;

	@Column({
		type: 'int8',
		nullable: true,
		name: 'fb_id',
	})
	public fbID: string;

	@Column({
		type: 'int4',
		nullable: true,
		name: 'vk_id',
	})
	public vkID: number;

	@Column({
		type: 'int4',
		nullable: true,
		name: 'twitch_id',
	})
	public twitchID: number;

	@Column({
		type: 'bool',
		default: 'false',
		name: 'is_completed_registration',
	})
	public isCompletedRegistration: boolean;

	@Column({
		type: 'bool',
		default: 'true',
		name: 'online',
	})
	public online: boolean;

	@Column({
		type: 'int4',
		default: '0',
		name: 'unread_messages_count',
	})
	public unreadMessagesCount: number;

	@Column({
		type: 'timestamptz',
		default: 'now()',
		name: 'notification_last_read_at',
	})
	public notificationLastReadAt: Date;

	@Column({
		type: 'int4',
		nullable: true,
		name: 'prefer_region_id',
	})
	public preferRegionID: number;

	@Column({
		type: 'bool',
		default: 'false',
		name: 'auto_connect',
	})
	public autoConnect: boolean;

	@Column({
		type: 'bool',
		default: 'true',
		name: 'receive_email_notifications',
	})
	public receiveEmailNotifications: boolean;

	@Column({
		type: 'bool',
		default: 'false',
		name: 'is_mobile',
	})
	public isMobile: boolean;

	@Column({
		type: 'int4',
		default: '0',
		name: 'unread_dialogs_count',
	})
	public unreadDialogsCount: number;

	@Column({
		type: 'int4',
		default: '0',
		name: 'friends_invites_count',
	})
	public friendsInvitesCount: number;

	@Column({
		type: 'int2',
		default: () => "'1'::smallint",
		name: 'region_id',
	})
	public regionID: number;

	@Column({
		type: 'int4',
		nullable: true,
		name: 'instagram_id',
	})
	public instagramID: number;
}

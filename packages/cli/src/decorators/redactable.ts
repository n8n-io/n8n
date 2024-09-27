import { RedactableError } from '@/errors/redactable.error';
import type { UserLike } from '@/events/maps/relay.event-map';

function toRedactable(userLike: UserLike) {
	return {
		userId: userLike.id,
		_email: userLike.email,
		_firstName: userLike.firstName,
		_lastName: userLike.lastName,
		globalRole: userLike.role,
	};
}

type FieldName = 'user' | 'inviter' | 'invitee';

/**
 * Mark redactable properties in a `{ user: UserLike }` field in an `LogStreamingEventRelay`
 * method arg. These properties will be later redacted by the log streaming
 * destination based on user prefs. Only for `n8n.audit.*` logs.
 *
 * Also transform `id` to `userId` and `role` to `globalRole`.
 *
 * @example
 *
 * { id: '123'; email: 'test@example.com', role: 'some-role' } ->
 * { userId: '123'; _email: 'test@example.com', globalRole: 'some-role' }
 */
export const Redactable =
	(fieldName: FieldName = 'user'): MethodDecorator =>
	(_target, _propertyName, propertyDescriptor: PropertyDescriptor) => {
		const originalMethod = propertyDescriptor.value as Function;

		type MethodArgs = Array<{ [fieldName: string]: UserLike }>;

		propertyDescriptor.value = function (...args: MethodArgs) {
			const index = args.findIndex((arg) => arg[fieldName] !== undefined);

			if (index === -1) throw new RedactableError(fieldName, args.toString());

			const userLike = args[index]?.[fieldName];

			// @ts-expect-error Transformation
			if (userLike) args[index][fieldName] = toRedactable(userLike);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return originalMethod.apply(this, args);
		};

		return propertyDescriptor;
	};

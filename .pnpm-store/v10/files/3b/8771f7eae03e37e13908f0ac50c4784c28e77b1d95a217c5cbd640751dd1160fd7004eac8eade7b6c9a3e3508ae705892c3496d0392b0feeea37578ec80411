import { AnyCallback, AuthenticateCallback, BaseAuthReturn, BaseUser, CallbackEvent, EventValueMap, Filters, OnCallback, ToUserLike } from "./types.cjs";
import { HTTPException } from "./error.cjs";

//#region src/auth/index.d.ts
declare class Auth<TExtra = {},
// eslint-disable-line @typescript-eslint/ban-types
TAuthReturn extends BaseAuthReturn = BaseAuthReturn, TUser extends BaseUser = ToUserLike<TAuthReturn>> {
  /**
   * @internal
   * @ignore
   */
  "~handlerCache": {
    authenticate?: AuthenticateCallback<BaseAuthReturn>;
    callbacks?: Record<string, AnyCallback>;
  };
  authenticate<T extends BaseAuthReturn>(cb: AuthenticateCallback<T>): Auth<TExtra, T>;
  on<T extends CallbackEvent>(event: T, callback: OnCallback<T, TUser>): this;
}
/**
 * Check if the provided user was provided by LangGraph Studio.
 *
 * By default, if you add custom authorization on your resources, this will also apply to interactions made from the Studio.
 * If you want, you can handle logged-in Studio users in a special way.
 *
 * @param user - The user to check
 * @returns True if the user is a studio user, false otherwise
 */
declare function isStudioUser(user: BaseUser): boolean;
//#endregion
export { Auth, type EventValueMap as AuthEventValueMap, type Filters as AuthFilters, HTTPException, isStudioUser };
//# sourceMappingURL=index.d.cts.map
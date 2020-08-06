export class User {
  sub?: string;
  provider?: string;
  id?: string;

  [key: string]: string | boolean | undefined;

  constructor (auth0User: { [key: string]: string | boolean | undefined }) {
    if (!auth0User) return;
    for (const key in auth0User) {
      if (auth0User.hasOwnProperty(key)) {
        this[key] = auth0User[key];
      }
    }
    this.sub = auth0User.sub as string;
    this.provider = this.sub.split('|')[0];
    this.id = this.sub.split('|')[1];
  }
}
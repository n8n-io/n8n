// Type augmentation for reflect-metadata
import 'reflect-metadata';

declare global {
  namespace Reflect {
    function getMetadata(key: string, target: any): any;
    function getMetadata(key: string, target: any, propertyKey: string | symbol): any;
  }
}
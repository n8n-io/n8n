export type ClassAccessorDecorator<This = any, Value = any> = (value: ClassAccessorDecoratorTarget<This, Value>, context: ClassAccessorDecoratorContext) => ClassAccessorDecoratorResult<This, Value> | void;
export type ClassGetterDecorator<This = any, Value = any> = (value: (this: This) => Value, context: ClassGetterDecoratorContext) => ((this: This) => Value) | void;
export type ClassSetterDecorator<This = any, Value = any> = (value: (this: This, value: Value) => void, context: ClassSetterDecoratorContext) => ((this: This, value: Value) => void) | void;
export type ClassMethodDecorator<This = any, Value extends (...p: any[]) => any = any> = (value: Value, context: ClassMethodDecoratorContext<This, Value>) => Value | void;
export type ClassFieldDecorator<This = any, Value extends (...p: any[]) => any = any> = (value: Value, context: ClassFieldDecoratorContext<This, Value>) => Value | void;
export type Decorator = ClassAccessorDecorator | ClassGetterDecorator | ClassSetterDecorator | ClassMethodDecorator | ClassFieldDecorator;

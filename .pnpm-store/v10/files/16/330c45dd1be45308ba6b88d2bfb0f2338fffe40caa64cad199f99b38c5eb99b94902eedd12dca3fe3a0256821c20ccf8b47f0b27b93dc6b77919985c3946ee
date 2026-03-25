import { IDepTreeNode, getAtom, getObservers, hasObservers } from "../internal"

export interface IDependencyTree {
    name: string
    dependencies?: IDependencyTree[]
}

export interface IObserverTree {
    name: string
    observers?: IObserverTree[]
}

export function getDependencyTree(thing: any, property?: string): IDependencyTree {
    return nodeToDependencyTree(getAtom(thing, property))
}

function nodeToDependencyTree(node: IDepTreeNode): IDependencyTree {
    const result: IDependencyTree = {
        name: node.name_
    }
    if (node.observing_ && node.observing_.length > 0) {
        result.dependencies = unique(node.observing_).map(nodeToDependencyTree)
    }
    return result
}

export function getObserverTree(thing: any, property?: string): IObserverTree {
    return nodeToObserverTree(getAtom(thing, property))
}

function nodeToObserverTree(node: IDepTreeNode): IObserverTree {
    const result: IObserverTree = {
        name: node.name_
    }
    if (hasObservers(node as any)) {
        result.observers = Array.from(<any>getObservers(node as any)).map(<any>nodeToObserverTree)
    }
    return result
}

function unique<T>(list: T[]): T[] {
    return Array.from(new Set(list))
}

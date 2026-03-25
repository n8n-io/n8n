import { useObserver } from "./useObserver"

interface IObserverProps {
    children?(): React.ReactElement | null
    render?(): React.ReactElement | null
}

function ObserverComponent({ children, render }: IObserverProps) {
    const component = children || render
    if (typeof component !== "function") {
        return null
    }
    return useObserver(component)
}
if ("production" !== process.env.NODE_ENV) {
    ObserverComponent.propTypes = {
        children: ObserverPropsCheck,
        render: ObserverPropsCheck
    }
}
ObserverComponent.displayName = "Observer"

export { ObserverComponent as Observer }

function ObserverPropsCheck(
    props: { [k: string]: any },
    key: string,
    componentName: string,
    location: any,
    propFullName: string
) {
    const extraKey = key === "children" ? "render" : "children"
    const hasProp = typeof props[key] === "function"
    const hasExtraProp = typeof props[extraKey] === "function"
    if (hasProp && hasExtraProp) {
        return new Error(
            "MobX Observer: Do not use children and render in the same time in`" + componentName
        )
    }

    if (hasProp || hasExtraProp) {
        return null
    }
    return new Error(
        "Invalid prop `" +
            propFullName +
            "` of type `" +
            typeof props[key] +
            "` supplied to" +
            " `" +
            componentName +
            "`, expected `function`."
    )
}

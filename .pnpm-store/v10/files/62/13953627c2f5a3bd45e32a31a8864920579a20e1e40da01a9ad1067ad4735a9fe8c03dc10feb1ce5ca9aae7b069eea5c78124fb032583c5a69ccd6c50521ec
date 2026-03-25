import { Reaction } from "mobx"
import { UniversalFinalizationRegistry } from "./UniversalFinalizationRegistry"

export const observerFinalizationRegistry = new UniversalFinalizationRegistry(
    (adm: { reaction: Reaction | null }) => {
        adm.reaction?.dispose()
        adm.reaction = null
    }
)
